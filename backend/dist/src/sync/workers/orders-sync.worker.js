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
const shopify_graphql_service_1 = require("../../shopify/shopify-graphql.service");
const shopify_service_1 = require("../../shopify/shopify.service");
const sync_state_service_1 = require("../sync-state.service");
let OrdersSyncWorker = OrdersSyncWorker_1 = class OrdersSyncWorker {
    prisma;
    shopifyService;
    shopifyGraphql;
    syncState;
    logger = new common_1.Logger(OrdersSyncWorker_1.name);
    constructor(prisma, shopifyService, shopifyGraphql, syncState) {
        this.prisma = prisma;
        this.shopifyService = shopifyService;
        this.shopifyGraphql = shopifyGraphql;
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
            let cursor = isInitial ? undefined : (state.lastCursor || undefined);
            let hasNextPage = true;
            let processed = 0;
            let lastCursor = null;
            while (hasNextPage) {
                const result = await this.shopifyGraphql.getOrders(merchant.shopDomain, merchant.accessToken, 50, cursor);
                const orders = result.orders.edges;
                for (const edge of orders) {
                    const order = edge.node;
                    let companyId = null;
                    let companyUserId = null;
                    if (order.customer?.legacyResourceId) {
                        const user = await this.prisma.companyUser.findFirst({
                            where: { shopifyCustomerId: BigInt(order.customer.legacyResourceId) },
                        });
                        if (user) {
                            companyUserId = user.id;
                            companyId = user.companyId;
                        }
                    }
                    const lineItems = order.lineItems?.edges?.map((e) => ({
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
                        properties: (e.node.customAttributes || []).map((a) => ({
                            name: a.key,
                            value: a.value,
                        })),
                    })) || [];
                    const shippingLine = order.shippingLine;
                    const isPickup = shippingLine
                        ? (shippingLine.title || '').toLowerCase().includes('pickup') ||
                            (shippingLine.code || '').toLowerCase().includes('pickup')
                        : false;
                    const orderAttributes = order.customAttributes || [];
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
                            shippingAddress: shippingAddress,
                            billingAddress: billingAddress,
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
                            shippingAddress: shippingAddress,
                            billingAddress: billingAddress,
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
                await this.syncState.updateCursor(merchantId, 'orders', lastCursor);
                await job.progress(Math.min((processed / 1000) * 100, 99));
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
    extractRiskLevel(order) {
        if (!order.order_status_url)
            return null;
        const risks = order.fraud_lines || order.risks || [];
        if (risks.length === 0)
            return 'low';
        const maxRisk = risks.reduce((max, risk) => {
            const level = risk.recommendation || risk.level || 'low';
            if (level === 'cancel' || level === 'high')
                return 'high';
            if (level === 'investigate' || level === 'medium')
                return max === 'high' ? 'high' : 'medium';
            return max;
        }, 'low');
        return maxRisk;
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
        shopify_graphql_service_1.ShopifyGraphqlService,
        sync_state_service_1.SyncStateService])
], OrdersSyncWorker);
//# sourceMappingURL=orders-sync.worker.js.map