import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyGraphqlService } from '../../shopify/shopify-graphql.service';
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
    private shopifyGraphql: ShopifyGraphqlService,
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

      // Get cursor from DB state for incremental sync
      const state = await this.syncState.getState(merchantId, 'orders');
      let cursor: string | undefined = isInitial ? undefined : (state.lastCursor || undefined);
      let hasNextPage = true;
      let processed = 0;
      let lastCursor: string | null = null;

      while (hasNextPage) {
        const result: any = await this.shopifyGraphql.getOrders(
          merchant.shopDomain,
          merchant.accessToken,
          50,
          cursor,
        );

        const orders = result.orders.edges;

        for (const edge of orders) {
          const order = edge.node;

          // Try to find associated company user
          let companyId: string | null = null;
          let companyUserId: string | null = null;

          if (order.customer?.legacyResourceId) {
            const user = await this.prisma.companyUser.findFirst({
              where: { shopifyCustomerId: BigInt(order.customer.legacyResourceId) },
            });
            if (user) {
              companyUserId = user.id;
              companyId = user.companyId;
            }
          }

          // Extract line items with customAttributes (file uploads live here)
          const lineItems = order.lineItems?.edges?.map((e: any) => ({
            title: e.node.title,
            quantity: e.node.quantity,
            sku: e.node.variant?.sku,
            variant_id: e.node.variant?.legacyResourceId,
            variant_title: e.node.variant?.title,
            price: e.node.originalTotalSet?.shopMoney?.amount,
            discounted_price: e.node.discountedTotalSet?.shopMoney?.amount,
            product_id: e.node.variant?.product?.legacyResourceId,
            product_title: e.node.variant?.product?.title,
            product_handle: e.node.variant?.product?.handle,
            image_url: e.node.image?.url || e.node.variant?.image?.url || null,
            properties: (e.node.customAttributes || []).map((a: any) => ({
              name: a.key,
              value: a.value,
            })),
          })) || [];

          // Detect pickup orders from shippingLine
          const shippingLine = order.shippingLine;
          const isPickup = shippingLine
            ? (shippingLine.title || '').toLowerCase().includes('pickup') ||
              (shippingLine.code || '').toLowerCase().includes('pickup')
            : false;

          // Extract order-level custom attributes
          const orderAttributes = order.customAttributes || [];

          // Extract shipping and billing address
          const shippingAddress = order.shippingAddress ? {
            first_name: order.shippingAddress.firstName,
            last_name: order.shippingAddress.lastName,
            address1: order.shippingAddress.address1,
            address2: order.shippingAddress.address2,
            city: order.shippingAddress.city,
            province: order.shippingAddress.province,
            country: order.shippingAddress.country,
            zip: order.shippingAddress.zip,
            phone: order.shippingAddress.phone,
            company: order.shippingAddress.company,
          } : null;

          const billingAddress = order.billingAddress ? {
            first_name: order.billingAddress.firstName,
            last_name: order.billingAddress.lastName,
            address1: order.billingAddress.address1,
            address2: order.billingAddress.address2,
            city: order.billingAddress.city,
            province: order.billingAddress.province,
            country: order.billingAddress.country,
            zip: order.billingAddress.zip,
            phone: order.billingAddress.phone,
            company: order.billingAddress.company,
          } : null;

          await this.prisma.orderLocal.upsert({
            where: {
              merchantId_shopifyOrderId: {
                merchantId,
                shopifyOrderId: BigInt(order.legacyResourceId),
              },
            },
            create: {
              merchantId,
              shopifyOrderId: BigInt(order.legacyResourceId),
              shopifyOrderNumber: order.name?.replace('#', ''),
              shopifyCustomerId: order.customer?.legacyResourceId ? BigInt(order.customer.legacyResourceId) : null,
              companyId,
              companyUserId,
              email: order.email,
              phone: order.phone,
              subtotal: parseFloat(order.subtotalPriceSet?.shopMoney?.amount || '0'),
              totalDiscounts: parseFloat(order.totalDiscountsSet?.shopMoney?.amount || '0'),
              totalTax: parseFloat(order.totalTaxSet?.shopMoney?.amount || '0'),
              totalPrice: parseFloat(order.totalPriceSet?.shopMoney?.amount || '0'),
              totalShipping: parseFloat(order.totalShippingPriceSet?.shopMoney?.amount || '0'),
              totalRefunded: order.totalRefundedSet?.shopMoney?.amount ? parseFloat(order.totalRefundedSet.shopMoney.amount) : null,
              currency: order.currencyCode,
              financialStatus: order.displayFinancialStatus?.toLowerCase(),
              fulfillmentStatus: order.displayFulfillmentStatus?.toLowerCase(),
              notes: order.note,
              tags: order.tags?.join(', '),
              riskLevel: order.riskLevel?.toLowerCase() || 'low',
              lineItems,
              shippingAddress: shippingAddress as any,
              billingAddress: billingAddress as any,
              discountCodes: order.discountCodes || [],
              processedAt: order.processedAt ? new Date(order.processedAt) : null,
              cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : null,
              closedAt: order.closedAt ? new Date(order.closedAt) : null,
              rawData: order,
            },
            update: {
              shopifyOrderNumber: order.name?.replace('#', ''),
              shopifyCustomerId: order.customer?.legacyResourceId ? BigInt(order.customer.legacyResourceId) : null,
              companyId,
              companyUserId,
              email: order.email,
              phone: order.phone,
              subtotal: parseFloat(order.subtotalPriceSet?.shopMoney?.amount || '0'),
              totalDiscounts: parseFloat(order.totalDiscountsSet?.shopMoney?.amount || '0'),
              totalTax: parseFloat(order.totalTaxSet?.shopMoney?.amount || '0'),
              totalPrice: parseFloat(order.totalPriceSet?.shopMoney?.amount || '0'),
              totalShipping: parseFloat(order.totalShippingPriceSet?.shopMoney?.amount || '0'),
              totalRefunded: order.totalRefundedSet?.shopMoney?.amount ? parseFloat(order.totalRefundedSet.shopMoney.amount) : null,
              currency: order.currencyCode,
              financialStatus: order.displayFinancialStatus?.toLowerCase(),
              fulfillmentStatus: order.displayFulfillmentStatus?.toLowerCase(),
              notes: order.note,
              tags: order.tags?.join(', '),
              riskLevel: order.riskLevel?.toLowerCase() || 'low',
              lineItems,
              shippingAddress: shippingAddress as any,
              billingAddress: billingAddress as any,
              discountCodes: order.discountCodes || [],
              processedAt: order.processedAt ? new Date(order.processedAt) : null,
              cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : null,
              closedAt: order.closedAt ? new Date(order.closedAt) : null,
              rawData: order,
              syncedAt: new Date(),
            },
          });

          processed++;
        }

        hasNextPage = result.orders.pageInfo.hasNextPage;
        lastCursor = result.orders.pageInfo.endCursor || null;
        cursor = lastCursor || undefined;

        // Update cursor in DB after each page (crash recovery)
        await this.syncState.updateCursor(merchantId, 'orders', lastCursor);
        await job.progress(Math.min((processed / 1000) * 100, 99));
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
