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
var ShopifyTokenRefreshService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyTokenRefreshService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../prisma/prisma.service");
let ShopifyTokenRefreshService = ShopifyTokenRefreshService_1 = class ShopifyTokenRefreshService {
    config;
    prisma;
    httpService;
    logger = new common_1.Logger(ShopifyTokenRefreshService_1.name);
    constructor(config, prisma, httpService) {
        this.config = config;
        this.prisma = prisma;
        this.httpService = httpService;
    }
    async onModuleInit() {
        setTimeout(() => this.handleTokenRefresh(), 5000);
    }
    async handleTokenRefresh() {
        this.logger.log('Starting scheduled Shopify token refresh...');
        const merchants = await this.prisma.merchant.findMany({
            where: { status: 'active' },
        });
        for (const merchant of merchants) {
            try {
                await this.refreshTokenForMerchant(merchant);
            }
            catch (error) {
                this.logger.error(`Failed to refresh token for ${merchant.shopDomain}: ${error.message}`);
            }
        }
    }
    async refreshTokenForMerchant(merchant) {
        const clientId = this.config.get('SHOPIFY_API_KEY');
        const clientSecret = this.config.get('SHOPIFY_API_SECRET');
        if (!clientId || !clientSecret) {
            this.logger.warn('SHOPIFY_API_KEY or SHOPIFY_API_SECRET not set — skipping token refresh');
            return null;
        }
        const url = `https://${merchant.shopDomain}/admin/oauth/access_token`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
            }));
            const { access_token, expires_in } = response.data;
            if (!access_token) {
                throw new Error('No access_token in response');
            }
            await this.prisma.merchant.update({
                where: { id: merchant.id },
                data: { accessToken: access_token },
            });
            const expiresInHours = Math.round(expires_in / 3600);
            this.logger.log(`🔑 Token refreshed for ${merchant.shopDomain} (expires in ${expiresInHours}h)`);
            return access_token;
        }
        catch (error) {
            const status = error?.response?.status;
            const message = error?.response?.data || error.message;
            this.logger.error(`Token refresh failed for ${merchant.shopDomain} [${status}]: ${JSON.stringify(message)}`);
            throw error;
        }
    }
};
exports.ShopifyTokenRefreshService = ShopifyTokenRefreshService;
__decorate([
    (0, schedule_1.Cron)('0 */12 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShopifyTokenRefreshService.prototype, "handleTokenRefresh", null);
exports.ShopifyTokenRefreshService = ShopifyTokenRefreshService = ShopifyTokenRefreshService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        axios_1.HttpService])
], ShopifyTokenRefreshService);
//# sourceMappingURL=shopify-token-refresh.service.js.map