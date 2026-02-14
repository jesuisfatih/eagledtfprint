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
var ProductsSyncWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsSyncWorker = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shopify_graphql_service_1 = require("../../shopify/shopify-graphql.service");
const shopify_service_1 = require("../../shopify/shopify.service");
const sync_state_service_1 = require("../sync-state.service");
let ProductsSyncWorker = ProductsSyncWorker_1 = class ProductsSyncWorker {
    prisma;
    shopifyService;
    shopifyGraphql;
    syncState;
    logger = new common_1.Logger(ProductsSyncWorker_1.name);
    constructor(prisma, shopifyService, shopifyGraphql, syncState) {
        this.prisma = prisma;
        this.shopifyService = shopifyService;
        this.shopifyGraphql = shopifyGraphql;
        this.syncState = syncState;
    }
    async handleSync(job) {
        const { merchantId, syncLogId, isInitial } = job.data;
        this.logger.log(`Starting products sync for merchant: ${merchantId} (initial: ${!!isInitial})`);
        const lockAcquired = await this.syncState.acquireLock(merchantId, 'products');
        if (!lockAcquired) {
            this.logger.warn(`Could not acquire lock for products sync (merchant: ${merchantId})`);
            return { skipped: true, reason: 'lock_not_acquired' };
        }
        try {
            const merchant = await this.prisma.merchant.findUnique({
                where: { id: merchantId },
            });
            if (!merchant) {
                throw new Error('Merchant not found');
            }
            const state = await this.syncState.getState(merchantId, 'products');
            let cursor = isInitial ? undefined : (state.lastCursor || undefined);
            let hasNextPage = true;
            let processed = 0;
            let lastCursor = null;
            while (hasNextPage) {
                const result = await this.shopifyGraphql.getProductsWithVariants(merchant.shopDomain, merchant.accessToken, 50, cursor);
                const products = result.products.edges;
                for (const edge of products) {
                    const product = edge.node;
                    const catalogProduct = await this.prisma.catalogProduct.upsert({
                        where: {
                            merchantId_shopifyProductId: {
                                merchantId,
                                shopifyProductId: BigInt(product.legacyResourceId),
                            },
                        },
                        create: {
                            merchantId,
                            shopifyProductId: BigInt(product.legacyResourceId),
                            title: product.title,
                            handle: product.handle,
                            description: product.description,
                            vendor: product.vendor,
                            productType: product.productType,
                            tags: product.tags?.join(', '),
                            status: product.status,
                            images: product.images?.edges?.map((e) => e.node) || [],
                            rawData: product,
                        },
                        update: {
                            title: product.title,
                            handle: product.handle,
                            description: product.description,
                            vendor: product.vendor,
                            productType: product.productType,
                            tags: product.tags?.join(', '),
                            status: product.status,
                            images: product.images?.edges?.map((e) => e.node) || [],
                            rawData: product,
                            syncedAt: new Date(),
                        },
                    });
                    if (product.variants?.edges) {
                        for (const variantEdge of product.variants.edges) {
                            const variant = variantEdge.node;
                            await this.prisma.catalogVariant.upsert({
                                where: {
                                    shopifyVariantId: BigInt(variant.legacyResourceId),
                                },
                                create: {
                                    productId: catalogProduct.id,
                                    shopifyVariantId: BigInt(variant.legacyResourceId),
                                    sku: variant.sku,
                                    title: variant.title,
                                    price: variant.price ? parseFloat(variant.price) : 0,
                                    compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
                                    inventoryQuantity: variant.inventoryQuantity || 0,
                                    weight: null,
                                    weightUnit: null,
                                    option1: variant.selectedOptions?.[0]?.value,
                                    option2: variant.selectedOptions?.[1]?.value,
                                    option3: variant.selectedOptions?.[2]?.value,
                                    rawData: variant,
                                },
                                update: {
                                    sku: variant.sku,
                                    title: variant.title,
                                    price: variant.price ? parseFloat(variant.price) : 0,
                                    compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
                                    inventoryQuantity: variant.inventoryQuantity || 0,
                                    weight: null,
                                    weightUnit: null,
                                    option1: variant.selectedOptions?.[0]?.value,
                                    option2: variant.selectedOptions?.[1]?.value,
                                    option3: variant.selectedOptions?.[2]?.value,
                                    rawData: variant,
                                    syncedAt: new Date(),
                                },
                            });
                        }
                    }
                    processed++;
                }
                hasNextPage = result.products.pageInfo.hasNextPage;
                lastCursor = result.products.pageInfo.endCursor || null;
                cursor = lastCursor || undefined;
                await this.syncState.updateCursor(merchantId, 'products', lastCursor);
                await job.progress(Math.min((processed / 500) * 100, 99));
            }
            await this.syncState.updateMetrics(merchantId, 'products', processed);
            await this.syncState.releaseLock(merchantId, 'products', 'completed');
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
            this.logger.log(`Completed products sync. Processed ${processed} products.`);
            return { processed };
        }
        catch (error) {
            this.logger.error('Products sync failed', error);
            await this.syncState.releaseLock(merchantId, 'products', 'failed', error.message);
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
exports.ProductsSyncWorker = ProductsSyncWorker;
__decorate([
    (0, bull_1.Process)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsSyncWorker.prototype, "handleSync", null);
exports.ProductsSyncWorker = ProductsSyncWorker = ProductsSyncWorker_1 = __decorate([
    (0, bull_1.Processor)('products-sync'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_service_1.ShopifyService,
        shopify_graphql_service_1.ShopifyGraphqlService,
        sync_state_service_1.SyncStateService])
], ProductsSyncWorker);
//# sourceMappingURL=products-sync.worker.js.map