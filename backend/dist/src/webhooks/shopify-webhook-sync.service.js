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
var ShopifyWebhookSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyWebhookSyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const shopify_customer_sync_service_1 = require("../shopify/shopify-customer-sync.service");
const shopify_service_1 = require("../shopify/shopify.service");
let ShopifyWebhookSyncService = ShopifyWebhookSyncService_1 = class ShopifyWebhookSyncService {
    prisma;
    shopifyCustomerSync;
    shopifyService;
    logger = new common_1.Logger(ShopifyWebhookSyncService_1.name);
    constructor(prisma, shopifyCustomerSync, shopifyService) {
        this.prisma = prisma;
        this.shopifyCustomerSync = shopifyCustomerSync;
        this.shopifyService = shopifyService;
    }
    async handleOrderCreate(orderData, shop) {
        const merchant = await this.shopifyService.getMerchantByShopDomain(shop);
        if (!merchant || !orderData.customer)
            return;
        const shopifyCustomerId = BigInt(orderData.customer.id);
        const companyUser = await this.prisma.companyUser.findFirst({
            where: { shopifyCustomerId },
        });
        if (companyUser) {
            const cart = await this.prisma.cart.findFirst({
                where: {
                    companyId: companyUser.companyId,
                    createdByUserId: companyUser.id,
                    status: 'draft',
                },
                orderBy: { updatedAt: 'desc' },
            });
            if (cart) {
                await this.prisma.cart.update({
                    where: { id: cart.id },
                    data: {
                        status: 'converted',
                        convertedAt: new Date(),
                    },
                });
                this.logger.log(`Cart ${cart.id} marked as converted to order`);
            }
        }
    }
};
exports.ShopifyWebhookSyncService = ShopifyWebhookSyncService;
exports.ShopifyWebhookSyncService = ShopifyWebhookSyncService = ShopifyWebhookSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_customer_sync_service_1.ShopifyCustomerSyncService,
        shopify_service_1.ShopifyService])
], ShopifyWebhookSyncService);
//# sourceMappingURL=shopify-webhook-sync.service.js.map