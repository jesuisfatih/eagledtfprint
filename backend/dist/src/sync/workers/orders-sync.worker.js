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
var OrdersSyncWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersSyncWorker = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shopify_rest_service_1 = require("../../shopify/shopify-rest.service");
const shopify_service_1 = require("../../shopify/shopify.service");
const sync_state_service_1 = require("../sync-state.service");
let OrdersSyncWorker = OrdersSyncWorker_1 = class OrdersSyncWorker {
    prisma;
    shopifyService;
    shopifyRest;
    syncState;
    logger = new common_1.Logger(OrdersSyncWorker_1.name);
    constructor(prisma, shopifyService, shopifyRest, syncState) {
        this.prisma = prisma;
        this.shopifyService = shopifyService;
        this.shopifyRest = shopifyRest;
        this.syncState = syncState;
    }
    async handleSync(job) {
        const { merchantId, syncLogId, isInitial } = job.data;
        this.logger.log(`Starting orders sync for merchant: ${merchantId} (initial: ${!!isInitial})`);
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
            const state = await this.syncState.getState(merchantId, 'orders');
            const sinceId = isInitial ? undefined : state.lastSyncedId;
            let path = `/orders.json?limit=250&status=any`;
            if (sinceId) {
                path += `&since_id=${sinceId.toString()}`;
            }
            const result = await this.shopifyRest.get(merchant.shopDomain, merchant.accessToken, path);
            const orders = result.orders || [];
            let processed = 0;
            let maxOrderId = null;
            for (const order of orders) {
                const orderId = BigInt(order.id);
                if (!maxOrderId || orderId > maxOrderId) {
                    maxOrderId = orderId;
                }
                let companyId;
                let companyUserId;
                if (order.customer?.id) {
                    const companyUser = await this.prisma.companyUser.findFirst({
                        where: {
                            shopifyCustomerId: BigInt(order.customer.id),
                        },
                    });
                    if (companyUser) {
                        companyUserId = companyUser.id;
                        companyId = companyUser.companyId;
                    }
                }
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
                        subtotal: order.subtotal_price ? parseFloat(order.subtotal_price) : 0,
                        totalDiscounts: order.total_discounts ? parseFloat(order.total_discounts) : 0,
                        totalTax: order.total_tax ? parseFloat(order.total_tax) : 0,
                        totalPrice: order.total_price ? parseFloat(order.total_price) : 0,
                        currency: order.currency,
                        financialStatus: order.financial_status,
                        fulfillmentStatus: order.fulfillment_status,
                        lineItems: order.line_items || [],
                        shippingAddress: order.shipping_address,
                        billingAddress: order.billing_address,
                        discountCodes: order.discount_codes || [],
                        rawData: order,
                    },
                    update: {
                        shopifyOrderNumber: order.order_number?.toString(),
                        shopifyCustomerId: order.customer?.id ? BigInt(order.customer.id) : null,
                        companyId,
                        companyUserId,
                        email: order.email,
                        subtotal: order.subtotal_price ? parseFloat(order.subtotal_price) : 0,
                        totalDiscounts: order.total_discounts ? parseFloat(order.total_discounts) : 0,
                        totalTax: order.total_tax ? parseFloat(order.total_tax) : 0,
                        totalPrice: order.total_price ? parseFloat(order.total_price) : 0,
                        currency: order.currency,
                        financialStatus: order.financial_status,
                        fulfillmentStatus: order.fulfillment_status,
                        lineItems: order.line_items || [],
                        shippingAddress: order.shipping_address,
                        billingAddress: order.billing_address,
                        discountCodes: order.discount_codes || [],
                        rawData: order,
                        syncedAt: new Date(),
                    },
                });
                processed++;
            }
            if (maxOrderId) {
                await this.syncState.updateCursor(merchantId, 'orders', null, maxOrderId);
            }
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
        }
        catch (error) {
            this.logger.error('Orders sync failed', error);
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
};
exports.OrdersSyncWorker = OrdersSyncWorker;
__decorate([
    (0, bull_1.Process)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersSyncWorker.prototype, "handleSync", null);
exports.OrdersSyncWorker = OrdersSyncWorker = OrdersSyncWorker_1 = __decorate([
    (0, bull_1.Processor)('orders-sync'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_service_1.ShopifyService,
        shopify_rest_service_1.ShopifyRestService,
        sync_state_service_1.SyncStateService])
], OrdersSyncWorker);
//# sourceMappingURL=orders-sync.worker.js.map