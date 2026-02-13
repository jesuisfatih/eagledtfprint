import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyRestService } from '../../shopify/shopify-rest.service';
import { ShopifyService } from '../../shopify/shopify.service';
import { SyncStateService } from '../sync-state.service';

interface SyncJobData {
  merchantId: string;
  syncLogId?: string;
  isInitial?: boolean;
}

@Processor('orders-sync')
export class OrdersSyncWorker {
  private readonly logger = new Logger(OrdersSyncWorker.name);

  constructor(
    private prisma: PrismaService,
    private shopifyService: ShopifyService,
    private shopifyRest: ShopifyRestService,
    private syncState: SyncStateService,
  ) {}

  @Process('sync')
  async handleSync(job: Job<SyncJobData>) {
    const { merchantId, syncLogId, isInitial } = job.data;
    this.logger.log(`Starting orders sync for merchant: ${merchantId} (initial: ${!!isInitial})`);

    // Acquire lock via DB
    const lockAcquired = await this.syncState.acquireLock(merchantId, 'orders');
    if (!lockAcquired) {
      this.logger.warn(`Could not acquire lock for orders sync (merchant: ${merchantId})`);
      return { skipped: true, reason: 'lock_not_acquired' };
    }

    try {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
      });

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Get last synced order ID from DB state for incremental sync
      const state = await this.syncState.getState(merchantId, 'orders');
      const sinceId = isInitial ? undefined : state.lastSyncedId;

      // Build query params - use since_id for incremental sync
      let path = `/orders.json?limit=250&status=any`;
      if (sinceId) {
        path += `&since_id=${sinceId.toString()}`;
      }

      const result: any = await this.shopifyRest.get(
        merchant.shopDomain,
        merchant.accessToken,
        path,
      );

      const orders = result.orders || [];
      let processed = 0;
      let maxOrderId: bigint | null = null;

      for (const order of orders) {
        // Track the highest order ID for incremental sync
        const orderId = BigInt(order.id);
        if (!maxOrderId || orderId > maxOrderId) {
          maxOrderId = orderId;
        }

        // Try to find associated company user
        let companyId: string | undefined;
        let companyUserId: string | undefined;

        if (order.customer?.id) {
          const user = await this.prisma.companyUser.findFirst({
            where: { shopifyCustomerId: BigInt(order.customer.id) },
          });
          if (user) {
            companyUserId = user.id;
            companyId = user.companyId;
          }
        }

        // Extract fulfillment data
        const fulfillments = (order.fulfillments || []).map((f: any) => ({
          id: f.id,
          status: f.status,
          trackingNumber: f.tracking_number,
          trackingNumbers: f.tracking_numbers,
          trackingUrl: f.tracking_url,
          trackingUrls: f.tracking_urls,
          trackingCompany: f.tracking_company,
          shipmentStatus: f.shipment_status,
          createdAt: f.created_at,
          updatedAt: f.updated_at,
          lineItems: f.line_items?.map((li: any) => ({
            id: li.id,
            title: li.title,
            quantity: li.quantity,
          })),
        }));

        // Extract refund data
        const refunds = (order.refunds || []).map((r: any) => ({
          id: r.id,
          note: r.note,
          createdAt: r.created_at,
          processedAt: r.processed_at,
          refundLineItems: r.refund_line_items?.map((rli: any) => ({
            lineItemId: rli.line_item_id,
            quantity: rli.quantity,
            subtotal: rli.subtotal,
          })),
          transactions: r.transactions?.map((t: any) => ({
            amount: t.amount,
            currency: t.currency,
            kind: t.kind,
            status: t.status,
          })),
        }));

        // Calculate total refunded
        const totalRefunded = refunds.reduce((sum: number, r: any) => {
          const refundAmount = r.transactions?.reduce(
            (ts: number, t: any) => ts + parseFloat(t.amount || '0'),
            0,
          ) || 0;
          return sum + refundAmount;
        }, 0);

        // Calculate total shipping
        const totalShipping = order.shipping_lines?.reduce(
          (sum: number, sl: any) => sum + parseFloat(sl.price || '0'),
          0,
        ) || 0;

        await this.prisma.orderLocal.upsert({
          where: {
            merchantId_shopifyOrderId: {
              merchantId,
              shopifyOrderId: BigInt(order.id),
            },
          },
          create: {
            merchantId,
            shopifyOrderId: BigInt(order.id),
            shopifyOrderNumber: order.order_number?.toString(),
            shopifyCustomerId: order.customer?.id ? BigInt(order.customer.id) : null,
            companyId,
            companyUserId,
            email: order.email,
            phone: order.phone,
            subtotal: order.subtotal_price ? parseFloat(order.subtotal_price) : 0,
            totalDiscounts: order.total_discounts ? parseFloat(order.total_discounts) : 0,
            totalTax: order.total_tax ? parseFloat(order.total_tax) : 0,
            totalPrice: order.total_price ? parseFloat(order.total_price) : 0,
            totalShipping,
            totalRefunded: totalRefunded > 0 ? totalRefunded : null,
            currency: order.currency,
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            notes: order.note,
            tags: order.tags,
            riskLevel: this.extractRiskLevel(order),
            lineItems: order.line_items || [],
            shippingAddress: order.shipping_address,
            billingAddress: order.billing_address,
            discountCodes: order.discount_codes || [],
            fulfillments: fulfillments.length > 0 ? fulfillments : null,
            refunds: refunds.length > 0 ? refunds : null,
            processedAt: order.processed_at ? new Date(order.processed_at) : null,
            cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
            closedAt: order.closed_at ? new Date(order.closed_at) : null,
            rawData: order,
          },
          update: {
            shopifyOrderNumber: order.order_number?.toString(),
            shopifyCustomerId: order.customer?.id ? BigInt(order.customer.id) : null,
            companyId,
            companyUserId,
            email: order.email,
            phone: order.phone,
            subtotal: order.subtotal_price ? parseFloat(order.subtotal_price) : 0,
            totalDiscounts: order.total_discounts ? parseFloat(order.total_discounts) : 0,
            totalTax: order.total_tax ? parseFloat(order.total_tax) : 0,
            totalPrice: order.total_price ? parseFloat(order.total_price) : 0,
            totalShipping,
            totalRefunded: totalRefunded > 0 ? totalRefunded : null,
            currency: order.currency,
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            notes: order.note,
            tags: order.tags,
            riskLevel: this.extractRiskLevel(order),
            lineItems: order.line_items || [],
            shippingAddress: order.shipping_address,
            billingAddress: order.billing_address,
            discountCodes: order.discount_codes || [],
            fulfillments: fulfillments.length > 0 ? fulfillments : null,
            refunds: refunds.length > 0 ? refunds : null,
            processedAt: order.processed_at ? new Date(order.processed_at) : null,
            cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
            closedAt: order.closed_at ? new Date(order.closed_at) : null,
            rawData: order,
            syncedAt: new Date(),
          },
        });

        processed++;
      }

      // Save last synced order ID for incremental sync
      if (maxOrderId) {
        await this.syncState.updateCursor(merchantId, 'orders', null, maxOrderId);
      }

      // Sync completed successfully
      await this.syncState.updateMetrics(merchantId, 'orders', processed);
      await this.syncState.releaseLock(merchantId, 'orders', 'completed');
      await this.syncState.updateMerchantLastSync(merchantId);

      if (syncLogId) {
        await this.prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            status: 'completed',
            recordsProcessed: processed,
            completedAt: new Date(),
          },
        });
      }

      this.logger.log(`Completed orders sync. Processed ${processed} orders.`);
      return { processed };
    } catch (error) {
      this.logger.error('Orders sync failed', error);

      // Release lock with failure state in DB
      await this.syncState.releaseLock(merchantId, 'orders', 'failed', error.message);

      if (syncLogId) {
        await this.prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date(),
          },
        });
      }

      throw error;
    }
  }

  /**
   * Extract risk level from order data
   */
  private extractRiskLevel(order: any): string | null {
    if (!order.order_status_url) return null;

    // Shopify includes fraud analysis in the order
    const risks = order.fraud_lines || order.risks || [];
    if (risks.length === 0) return 'low';

    const maxRisk = risks.reduce((max: string, risk: any) => {
      const level = risk.recommendation || risk.level || 'low';
      if (level === 'cancel' || level === 'high') return 'high';
      if (level === 'investigate' || level === 'medium') return max === 'high' ? 'high' : 'medium';
      return max;
    }, 'low');

    return maxRisk;
  }
}
