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
var ShopifyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let ShopifyService = ShopifyService_1 = class ShopifyService {
    config;
    prisma;
    logger = new common_1.Logger(ShopifyService_1.name);
    apiVersion;
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.apiVersion = this.config.get('SHOPIFY_API_VERSION', '2024-10');
    }
    async getMerchantAccessToken(merchantId) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId },
        });
        if (!merchant) {
            throw new Error('Merchant not found');
        }
        return merchant.accessToken;
    }
    async getMerchantByShopDomain(shopDomain) {
        if (!shopDomain) {
            this.logger.warn('getMerchantByShopDomain called with empty shopDomain');
            return null;
        }
        let merchant = await this.prisma.merchant.findFirst({
            where: { shopDomain },
        });
        if (!merchant && shopDomain.includes('.myshopify.com')) {
            const shopName = shopDomain.replace('.myshopify.com', '');
            merchant = await this.prisma.merchant.findFirst({
                where: {
                    shopDomain: { contains: shopName },
                },
            });
        }
        return merchant;
    }
    getApiVersion() {
        return this.apiVersion;
    }
    buildAdminApiUrl(shop, path) {
        return `https://${shop}/admin/api/${this.apiVersion}${path}`;
    }
    buildAdminGraphQLUrl(shop) {
        return `https://${shop}/admin/api/${this.apiVersion}/graphql.json`;
    }
};
exports.ShopifyService = ShopifyService;
exports.ShopifyService = ShopifyService = ShopifyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], ShopifyService);
//# sourceMappingURL=shopify.service.js.map