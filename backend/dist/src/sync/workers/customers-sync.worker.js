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
var CustomersSyncWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersSyncWorker = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shopify_graphql_service_1 = require("../../shopify/shopify-graphql.service");
const shopify_service_1 = require("../../shopify/shopify.service");
const sync_state_service_1 = require("../sync-state.service");
let CustomersSyncWorker = CustomersSyncWorker_1 = class CustomersSyncWorker {
    prisma;
    shopifyService;
    shopifyGraphql;
    syncState;
    logger = new common_1.Logger(CustomersSyncWorker_1.name);
    constructor(prisma, shopifyService, shopifyGraphql, syncState) {
        this.prisma = prisma;
        this.shopifyService = shopifyService;
        this.shopifyGraphql = shopifyGraphql;
        this.syncState = syncState;
    }
    async handleSync(job) {
        const { merchantId, syncLogId, isInitial } = job.data;
        this.logger.log(`Starting customers sync for merchant: ${merchantId} (initial: ${!!isInitial})`);
        const lockAcquired = await this.syncState.acquireLock(merchantId, 'customers');
        if (!lockAcquired) {
            this.logger.warn(`Could not acquire lock for customers sync (merchant: ${merchantId})`);
            return { skipped: true, reason: 'lock_not_acquired' };
        }
        try {
            const merchant = await this.prisma.merchant.findUnique({
                where: { id: merchantId },
            });
            if (!merchant) {
                throw new Error('Merchant not found');
            }
            const state = await this.syncState.getState(merchantId, 'customers');
            let cursor = isInitial ? undefined : (state.lastCursor || undefined);
            let hasNextPage = true;
            let processed = 0;
            let lastCursor = null;
            while (hasNextPage) {
                const result = await this.shopifyGraphql.getCustomers(merchant.shopDomain, merchant.accessToken, 50, cursor);
                const customers = result.customers.edges;
                for (const edge of customers) {
                    const customer = edge.node;
                    const totalSpent = customer.amountSpent?.amount
                        ? parseFloat(customer.amountSpent.amount)
                        : 0;
                    const ordersCount = customer.numberOfOrders
                        ? parseInt(customer.numberOfOrders, 10)
                        : 0;
                    await this.prisma.shopifyCustomer.upsert({
                        where: {
                            merchantId_shopifyCustomerId: {
                                merchantId,
                                shopifyCustomerId: BigInt(customer.legacyResourceId),
                            },
                        },
                        create: {
                            merchantId,
                            shopifyCustomerId: BigInt(customer.legacyResourceId),
                            email: customer.email,
                            firstName: customer.firstName,
                            lastName: customer.lastName,
                            phone: customer.phone,
                            tags: customer.tags?.join(', '),
                            note: customer.note,
                            totalSpent,
                            ordersCount,
                            addresses: customer.addresses || [],
                            rawData: customer,
                        },
                        update: {
                            email: customer.email,
                            firstName: customer.firstName,
                            lastName: customer.lastName,
                            phone: customer.phone,
                            tags: customer.tags?.join(', '),
                            note: customer.note,
                            totalSpent,
                            ordersCount,
                            addresses: customer.addresses || [],
                            rawData: customer,
                            syncedAt: new Date(),
                        },
                    });
                    processed++;
                }
                hasNextPage = result.customers.pageInfo.hasNextPage;
                lastCursor = result.customers.pageInfo.endCursor || null;
                cursor = lastCursor || undefined;
                await this.syncState.updateCursor(merchantId, 'customers', lastCursor);
                await job.progress(Math.min((processed / 1000) * 100, 99));
            }
            await this.syncState.updateMetrics(merchantId, 'customers', processed);
            await this.syncState.releaseLock(merchantId, 'customers', 'completed');
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
            this.logger.log(`Completed customers sync. Processed ${processed} customers.`);
            return { processed };
        }
        catch (error) {
            this.logger.error('Customers sync failed', error);
            await this.syncState.releaseLock(merchantId, 'customers', 'failed', error.message);
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
exports.CustomersSyncWorker = CustomersSyncWorker;
__decorate([
    (0, bull_1.Process)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomersSyncWorker.prototype, "handleSync", null);
exports.CustomersSyncWorker = CustomersSyncWorker = CustomersSyncWorker_1 = __decorate([
    (0, bull_1.Processor)('customers-sync'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_service_1.ShopifyService,
        shopify_graphql_service_1.ShopifyGraphqlService,
        sync_state_service_1.SyncStateService])
], CustomersSyncWorker);
//# sourceMappingURL=customers-sync.worker.js.map