"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OrdersHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersHandler = void 0;
const common_1 = require("@nestjs/common");
const dittofeed_service_1 = require("../../dittofeed/dittofeed.service");
const pickup_service_1 = require("../../pickup/pickup.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const shopify_service_1 = require("../../shopify/shopify.service");
const shopify_webhook_sync_service_1 = require("../shopify-webhook-sync.service");
let OrdersHandler = OrdersHandler_1 = class OrdersHandler {
    prisma;
    webhookSync;
    shopifyService;
    pickupService;
    dittofeedService;
    logger = new common_1.Logger(OrdersHandler_1.name);
    constructor(prisma, webhookSync, shopifyService, pickupService, dittofeedService) {
        this.prisma = prisma;
        this.webhookSync = webhookSync;
        this.shopifyService = shopifyService;
        this.pickupService = pickupService;
        this.dittofeedService = dittofeedService;
    }
    async handleOrderCreate(orderData, headers) {
        try {
            const shop = headers['x-shopify-shop-domain'];
            const merchant = await this.shopifyService.getMerchantByShopDomain(shop);
            if (!merchant) {
                this.logger.warn(`Merchant not found for shop: ${shop}`);
                return { success: false };
            }
            let companyId;
            let companyUserId;
            let companyName;
            if (orderData.customer?.id) {
                const user = await this.prisma.companyUser.findFirst({
                    where: { shopifyCustomerId: BigInt(orderData.customer.id) },
                    include: { company: { select: { name: true } } },
                });
                if (user) {
                    companyUserId = user.id;
                    companyId = user.companyId;
                    companyName = user.company.name;
                }
            }
            const fulfillments = (orderData.fulfillments || []).map((f) => ({
                id: f.id,
                status: f.status,
                trackingNumber: f.tracking_number,
                trackingUrl: f.tracking_url,
                trackingCompany: f.tracking_company,
                shipmentStatus: f.shipment_status,
                createdAt: f.created_at,
                lineItems: (f.line_items || []).map((li) => ({
                    id: li.id,
                    title: li.title,
                    quantity: li.quantity,
                })),
            }));
            const refunds = (orderData.refunds || []).map((r) => ({
                id: r.id,
                note: r.note,
                createdAt: r.created_at,
                refundLineItems: (r.refund_line_items || []).map((rli) => ({
                    lineItemId: rli.line_item_id,
                    quantity: rli.quantity,
                    subtotal: rli.subtotal,
                })),
                transactions: (r.transactions || []).map((t) => ({
                    amount: t.amount,
                    kind: t.kind,
                    status: t.status,
                })),
            }));
            const totalRefunded = refunds.reduce((sum, r) => {
                return sum + (r.transactions || []).reduce((ts, t) => {
                    return ts + (t.kind === 'refund' && t.status === 'success' ? parseFloat(t.amount || '0') : 0);
                }, 0);
            }, 0);
            const totalShipping = (orderData.shipping_lines || [])
                .reduce((sum, sl) => sum + parseFloat(sl.price || '0'), 0);
            let riskLevel = 'normal';
            if (orderData.order_status_url) {
                const risks = orderData.risks || [];
                if (risks.length > 0) {
                    const highRisk = risks.find((r) => r.recommendation === 'cancel');
                    const medRisk = risks.find((r) => r.recommendation === 'investigate');
                    riskLevel = highRisk ? 'high' : medRisk ? 'medium' : 'low';
                }
            }
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
            await this.webhookSync.handleOrderCreate(orderData, shop);
            if (companyUserId) {
                try {
                    await this.dittofeedService.trackOrderPlaced({
                        userId: companyUserId,
                        orderId: orderLocal.id,
                        merchantId: merchant.id,
                        orderNumber: orderData.order_number?.toString() || '',
                        totalPrice: parseFloat(orderData.total_price || '0'),
                        financialStatus: orderData.financial_status || '',
                        fulfillmentStatus: orderData.fulfillment_status || '',
                        companyId,
                        companyName,
                        lineItems: orderData.line_items || [],
                        currency: orderData.currency || 'USD',
                        email: orderData.email,
                    });
                    this.logger.log(`Dittofeed: order_placed event sent for order #${orderData.order_number}`);
                }
                catch (dfErr) {
                    this.logger.warn(`Dittofeed event failed for order #${orderData.order_number}: ${dfErr.message}`);
                }
            }
            try {
                const pickupOrder = await this.pickupService.createFromWebhookOrder(merchant.id, orderLocal, orderData);
                if (pickupOrder) {
                    this.logger.log(`Pickup order auto-created for order #${orderData.order_number}, QR: ${pickupOrder.qrCode}`);
                    if (companyUserId) {
                        try {
                            await this.dittofeedService.trackPickupReady(companyUserId, {
                                orderId: orderLocal.id,
                                orderNumber: orderData.order_number?.toString() || '',
                                qrCode: pickupOrder.qrCode,
                            });
                        }
                        catch (dfErr) {
                            this.logger.warn(`Dittofeed pickup_ready event failed: ${dfErr.message}`);
                        }
                    }
                }
            }
            catch (pickupError) {
                this.logger.warn(`Failed to auto-create pickup order for #${orderData.order_number}`, pickupError);
            }
            return { success: true };
        }
        catch (error) {
            this.logger.error('Failed to handle order create', error);
            return { success: false, error: error.message };
        }
    }
    async handleOrderPaid(orderData, headers) {
        try {
            const shop = headers['x-shopify-shop-domain'];
            const merchant = await this.shopifyService.getMerchantByShopDomain(shop);
            if (!merchant) {
                return { success: false };
            }
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
            if (orderData.customer?.id) {
                const user = await this.prisma.companyUser.findFirst({
                    where: { shopifyCustomerId: BigInt(orderData.customer.id) },
                });
                if (user) {
                    try {
                        await this.dittofeedService.trackOrderPaid(user.id, orderData.id?.toString() || '', orderData.order_number?.toString() || '', parseFloat(orderData.total_price || '0'));
                    }
                    catch (dfErr) {
                        this.logger.warn(`Dittofeed order_paid event failed: ${dfErr.message}`);
                    }
                }
            }
            this.logger.log(`Order paid: ${orderData.order_number}`);
            return { success: true };
        }
        catch (error) {
            this.logger.error('Failed to handle order paid', error);
            return { success: false };
        }
    }
    async handleOrderUpdated(orderData, headers) {
        try {
            const shop = headers['x-shopify-shop-domain'];
            const merchant = await this.shopifyService.getMerchantByShopDomain(shop);
            if (!merchant)
                return { success: false };
            const fulfillments = (orderData.fulfillments || []).map((f) => ({
                id: f.id,
                status: f.status,
                trackingNumber: f.tracking_number,
                trackingUrl: f.tracking_url,
                trackingCompany: f.tracking_company,
                shipmentStatus: f.shipment_status,
                createdAt: f.created_at,
                lineItems: (f.line_items || []).map((li) => ({
                    id: li.id,
                    title: li.title,
                    quantity: li.quantity,
                })),
            }));
            const refunds = (orderData.refunds || []).map((r) => ({
                id: r.id,
                note: r.note,
                createdAt: r.created_at,
                refundLineItems: (r.refund_line_items || []).map((rli) => ({
                    lineItemId: rli.line_item_id,
                    quantity: rli.quantity,
                    subtotal: rli.subtotal,
                })),
                transactions: (r.transactions || []).map((t) => ({
                    amount: t.amount,
                    kind: t.kind,
                    status: t.status,
                })),
            }));
            const totalRefunded = refunds.reduce((sum, r) => {
                return sum + (r.transactions || []).reduce((ts, t) => {
                    return ts + (t.kind === 'refund' && t.status === 'success' ? parseFloat(t.amount || '0') : 0);
                }, 0);
            }, 0);
            const existingOrder = await this.prisma.orderLocal.findFirst({
                where: { merchantId: merchant.id, shopifyOrderId: BigInt(orderData.id) },
                select: { totalRefunded: true },
            });
            const previousRefunded = existingOrder?.totalRefunded ?? 0;
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
            if (orderData.customer?.id) {
                const user = await this.prisma.companyUser.findFirst({
                    where: { shopifyCustomerId: BigInt(orderData.customer.id) },
                });
                if (user) {
                    try {
                        if (orderData.fulfillment_status === 'fulfilled' && fulfillments.length > 0) {
                            const latestFulfillment = fulfillments[fulfillments.length - 1];
                            await this.dittofeedService.trackOrderFulfilled(user.id, orderData.id?.toString() || '', orderData.order_number?.toString() || '', merchant.id, {
                                trackingNumber: latestFulfillment.trackingNumber,
                                trackingUrl: latestFulfillment.trackingUrl,
                                carrier: latestFulfillment.trackingCompany,
                            });
                        }
                        if (orderData.cancelled_at) {
                            await this.dittofeedService.trackEvent(user.id, 'order_cancelled', {
                                orderId: orderData.id?.toString() || '',
                                orderNumber: orderData.order_number?.toString() || '',
                                cancelReason: orderData.cancel_reason || '',
                            });
                        }
                        if (totalRefunded > 0 && totalRefunded > Number(previousRefunded || 0)) {
                            await this.dittofeedService.trackEvent(user.id, 'order_refunded', {
                                orderId: orderData.id?.toString() || '',
                                orderNumber: orderData.order_number?.toString() || '',
                                refundAmount: totalRefunded,
                                newRefundAmount: totalRefunded - Number(previousRefunded || 0),
                            });
                        }
                    }
                    catch (dfErr) {
                        this.logger.warn(`Dittofeed order update events failed: ${dfErr.message}`);
                    }
                }
            }
            this.logger.log(`Order updated: ${orderData.order_number}`);
            return { success: true };
        }
        catch (error) {
            this.logger.error('Failed to handle order update', error);
            return { success: false };
        }
    }
};
exports.OrdersHandler = OrdersHandler;
exports.OrdersHandler = OrdersHandler = OrdersHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_webhook_sync_service_1.ShopifyWebhookSyncService,
        shopify_service_1.ShopifyService,
        pickup_service_1.PickupService,
        dittofeed_service_1.DittofeedService])
], OrdersHandler);
//# sourceMappingURL=orders.handler.js.map