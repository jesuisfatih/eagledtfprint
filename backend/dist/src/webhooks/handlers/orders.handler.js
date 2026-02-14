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
const prisma_service_1 = require("../../prisma/prisma.service");
const shopify_webhook_sync_service_1 = require("../shopify-webhook-sync.service");
const shopify_service_1 = require("../../shopify/shopify.service");
let OrdersHandler = OrdersHandler_1 = class OrdersHandler {
    prisma;
    webhookSync;
    shopifyService;
    logger = new common_1.Logger(OrdersHandler_1.name);
    constructor(prisma, webhookSync, shopifyService) {
        this.prisma = prisma;
        this.webhookSync = webhookSync;
        this.shopifyService = shopifyService;
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
            if (orderData.customer?.id) {
                const user = await this.prisma.companyUser.findFirst({
                    where: { shopifyCustomerId: BigInt(orderData.customer.id) },
                });
                if (user) {
                    companyUserId = user.id;
                    companyId = user.companyId;
                }
            }
            await this.prisma.orderLocal.create({
                data: {
                    merchantId: merchant.id,
                    shopifyOrderId: BigInt(orderData.id),
                    shopifyOrderNumber: orderData.order_number?.toString(),
                    shopifyCustomerId: orderData.customer?.id ? BigInt(orderData.customer.id) : null,
                    companyId,
                    companyUserId,
                    email: orderData.email,
                    subtotal: parseFloat(orderData.subtotal_price || '0'),
                    totalDiscounts: parseFloat(orderData.total_discounts || '0'),
                    totalTax: parseFloat(orderData.total_tax || '0'),
                    totalPrice: parseFloat(orderData.total_price || '0'),
                    currency: orderData.currency,
                    financialStatus: orderData.financial_status,
                    fulfillmentStatus: orderData.fulfillment_status,
                    lineItems: orderData.line_items || [],
                    shippingAddress: orderData.shipping_address,
                    billingAddress: orderData.billing_address,
                    discountCodes: orderData.discount_codes || [],
                    rawData: orderData,
                },
            });
            this.logger.log(`Order created: ${orderData.order_number} for ${shop}`);
            await this.webhookSync.handleOrderCreate(orderData, shop);
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
                    rawData: orderData,
                },
            });
            this.logger.log(`Order paid: ${orderData.order_number}`);
            return { success: true };
        }
        catch (error) {
            this.logger.error('Failed to handle order paid', error);
            return { success: false };
        }
    }
};
exports.OrdersHandler = OrdersHandler;
exports.OrdersHandler = OrdersHandler = OrdersHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_webhook_sync_service_1.ShopifyWebhookSyncService,
        shopify_service_1.ShopifyService])
], OrdersHandler);
//# sourceMappingURL=orders.handler.js.map