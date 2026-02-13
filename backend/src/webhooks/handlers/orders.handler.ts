import { Injectable, Logger } from '@nestjs/common';
import { PickupService } from '../../pickup/pickup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyService } from '../../shopify/shopify.service';
import { ShopifyWebhookSyncService } from '../shopify-webhook-sync.service';

@Injectable()
export class OrdersHandler {
  private readonly logger = new Logger(OrdersHandler.name);

  constructor(
    private prisma: PrismaService,
    private webhookSync: ShopifyWebhookSyncService,
    private shopifyService: ShopifyService,
    private pickupService: PickupService,
  ) {}

  async handleOrderCreate(orderData: any, headers: any) {
    try {
      const shop = headers['x-shopify-shop-domain'];

      const merchant = await this.shopifyService.getMerchantByShopDomain(shop);

      if (!merchant) {
        this.logger.warn(`Merchant not found for shop: ${shop}`);
        return { success: false };
      }

      // Find company user by Shopify customer ID
      let companyId: string | undefined;
      let companyUserId: string | undefined;

      if (orderData.customer?.id) {
        const user = await this.prisma.companyUser.findFirst({
          where: { shopifyCustomerId: BigInt(orderData.customer.id) },
        });
        if (user) {
          companyUserId = user.id;
          companyId = user.companyId;
        }
      }

      // Extract fulfillments
      const fulfillments = (orderData.fulfillments || []).map((f: any) => ({
        id: f.id,
        status: f.status,
        trackingNumber: f.tracking_number,
        trackingUrl: f.tracking_url,
        trackingCompany: f.tracking_company,
        shipmentStatus: f.shipment_status,
        createdAt: f.created_at,
        lineItems: (f.line_items || []).map((li: any) => ({
          id: li.id,
          title: li.title,
          quantity: li.quantity,
        })),
      }));

      // Extract refunds
      const refunds = (orderData.refunds || []).map((r: any) => ({
        id: r.id,
        note: r.note,
        createdAt: r.created_at,
        refundLineItems: (r.refund_line_items || []).map((rli: any) => ({
          lineItemId: rli.line_item_id,
          quantity: rli.quantity,
          subtotal: rli.subtotal,
        })),
        transactions: (r.transactions || []).map((t: any) => ({
          amount: t.amount,
          kind: t.kind,
          status: t.status,
        })),
      }));

      // Calculate total refunded
      const totalRefunded = refunds.reduce((sum: number, r: any) => {
        return sum + (r.transactions || []).reduce((ts: number, t: any) => {
          return ts + (t.kind === 'refund' && t.status === 'success' ? parseFloat(t.amount || '0') : 0);
        }, 0);
      }, 0);

      // Calculate total shipping
      const totalShipping = (orderData.shipping_lines || [])
        .reduce((sum: number, sl: any) => sum + parseFloat(sl.price || '0'), 0);

      // Extract risk level
      let riskLevel = 'normal';
      if (orderData.order_status_url) {
        // Shopify includes fraud analysis in some orders
        const risks = orderData.risks || [];
        if (risks.length > 0) {
          const highRisk = risks.find((r: any) => r.recommendation === 'cancel');
          const medRisk = risks.find((r: any) => r.recommendation === 'investigate');
          riskLevel = highRisk ? 'high' : medRisk ? 'medium' : 'low';
        }
      }

      // Create order record with all enriched fields
      const orderLocal = await this.prisma.orderLocal.create({
        data: {
          merchantId: merchant.id,
          shopifyOrderId: BigInt(orderData.id),
          shopifyOrderNumber: orderData.order_number?.toString(),
          shopifyCustomerId: orderData.customer?.id ? BigInt(orderData.customer.id) : null,
          companyId,
          companyUserId,
          email: orderData.email,
          phone: orderData.phone || orderData.billing_address?.phone || null,
          subtotal: parseFloat(orderData.subtotal_price || '0'),
          totalDiscounts: parseFloat(orderData.total_discounts || '0'),
          totalTax: parseFloat(orderData.total_tax || '0'),
          totalPrice: parseFloat(orderData.total_price || '0'),
          totalShipping,
          totalRefunded,
          currency: orderData.currency,
          financialStatus: orderData.financial_status,
          fulfillmentStatus: orderData.fulfillment_status,
          lineItems: orderData.line_items || [],
          shippingAddress: orderData.shipping_address,
          billingAddress: orderData.billing_address,
          discountCodes: orderData.discount_codes || [],
          fulfillments,
          refunds,
          notes: orderData.note || null,
          tags: orderData.tags || null,
          riskLevel,
          processedAt: orderData.processed_at ? new Date(orderData.processed_at) : null,
          cancelledAt: orderData.cancelled_at ? new Date(orderData.cancelled_at) : null,
          closedAt: orderData.closed_at ? new Date(orderData.closed_at) : null,
          rawData: orderData,
        },
      });

      this.logger.log(`Order created: ${orderData.order_number} for ${shop}`);

      // Sync cart status
      await this.webhookSync.handleOrderCreate(orderData, shop);

      // Auto-create pickup order if it's a pickup order
      try {
        const pickupOrder = await this.pickupService.createFromWebhookOrder(
          merchant.id,
          orderLocal,
          orderData,
        );
        if (pickupOrder) {
          this.logger.log(`Pickup order auto-created for order #${orderData.order_number}, QR: ${pickupOrder.qrCode}`);
        }
      } catch (pickupError) {
        // Don't let pickup creation failure break the webhook
        this.logger.warn(`Failed to auto-create pickup order for #${orderData.order_number}`, pickupError);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to handle order create', error);
      return { success: false, error: error.message };
    }
  }

  async handleOrderPaid(orderData: any, headers: any) {
    try {
      const shop = headers['x-shopify-shop-domain'];

      const merchant = await this.shopifyService.getMerchantByShopDomain(shop);

      if (!merchant) {
        return { success: false };
      }

      // Update order status with enriched fields
      await this.prisma.orderLocal.updateMany({
        where: {
          merchantId: merchant.id,
          shopifyOrderId: BigInt(orderData.id),
        },
        data: {
          financialStatus: orderData.financial_status,
          fulfillmentStatus: orderData.fulfillment_status,
          processedAt: orderData.processed_at ? new Date(orderData.processed_at) : undefined,
          rawData: orderData,
        },
      });

      this.logger.log(`Order paid: ${orderData.order_number}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to handle order paid', error);
      return { success: false };
    }
  }

  async handleOrderUpdated(orderData: any, headers: any) {
    try {
      const shop = headers['x-shopify-shop-domain'];
      const merchant = await this.shopifyService.getMerchantByShopDomain(shop);
      if (!merchant) return { success: false };

      // Extract fulfillments
      const fulfillments = (orderData.fulfillments || []).map((f: any) => ({
        id: f.id,
        status: f.status,
        trackingNumber: f.tracking_number,
        trackingUrl: f.tracking_url,
        trackingCompany: f.tracking_company,
        shipmentStatus: f.shipment_status,
        createdAt: f.created_at,
        lineItems: (f.line_items || []).map((li: any) => ({
          id: li.id,
          title: li.title,
          quantity: li.quantity,
        })),
      }));

      // Extract refunds
      const refunds = (orderData.refunds || []).map((r: any) => ({
        id: r.id,
        note: r.note,
        createdAt: r.created_at,
        refundLineItems: (r.refund_line_items || []).map((rli: any) => ({
          lineItemId: rli.line_item_id,
          quantity: rli.quantity,
          subtotal: rli.subtotal,
        })),
        transactions: (r.transactions || []).map((t: any) => ({
          amount: t.amount,
          kind: t.kind,
          status: t.status,
        })),
      }));

      const totalRefunded = refunds.reduce((sum: number, r: any) => {
        return sum + (r.transactions || []).reduce((ts: number, t: any) => {
          return ts + (t.kind === 'refund' && t.status === 'success' ? parseFloat(t.amount || '0') : 0);
        }, 0);
      }, 0);

      await this.prisma.orderLocal.updateMany({
        where: {
          merchantId: merchant.id,
          shopifyOrderId: BigInt(orderData.id),
        },
        data: {
          financialStatus: orderData.financial_status,
          fulfillmentStatus: orderData.fulfillment_status,
          fulfillments,
          refunds,
          totalRefunded,
          notes: orderData.note || undefined,
          tags: orderData.tags || undefined,
          cancelledAt: orderData.cancelled_at ? new Date(orderData.cancelled_at) : undefined,
          closedAt: orderData.closed_at ? new Date(orderData.closed_at) : undefined,
          rawData: orderData,
        },
      });

      this.logger.log(`Order updated: ${orderData.order_number}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to handle order update', error);
      return { success: false };
    }
  }
}
