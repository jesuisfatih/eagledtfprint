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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SettingsService = class SettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMerchantSettings(merchantId) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId },
            select: {
                id: true,
                shopDomain: true,
                settings: true,
                snippetEnabled: true,
                planName: true,
                lastSyncAt: true,
            },
        });
        const [totalCustomers, syncedCustomers, totalProducts, totalOrders] = await Promise.all([
            this.prisma.companyUser.count({ where: { company: { merchantId } } }),
            this.prisma.companyUser.count({ where: { company: { merchantId }, shopifyCustomerId: { not: null } } }),
            this.prisma.catalogProduct.count({ where: { merchantId } }),
            this.prisma.orderLocal.count({ where: { merchantId } }),
        ]);
        return {
            ...merchant,
            stats: {
                totalCustomers,
                syncedCustomers,
                totalProducts,
                totalOrders,
            },
        };
    }
    async updateMerchantSettings(merchantId, settings) {
        return this.prisma.merchant.update({
            where: { id: merchantId },
            data: {
                settings: settings,
                updatedAt: new Date(),
            },
        });
    }
    async toggleSnippet(merchantId, enabled) {
        return this.prisma.merchant.update({
            where: { id: merchantId },
            data: { snippetEnabled: enabled },
        });
    }
    async getCompanySettings(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                settings: true,
                companyGroup: true,
                status: true,
            },
        });
        return company;
    }
    async updateCompanySettings(companyId, settings) {
        return this.prisma.company.update({
            where: { id: companyId },
            data: {
                settings: settings,
                updatedAt: new Date(),
            },
        });
    }
    async getSsoSettings(merchantId) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { settings: true },
        });
        const settings = merchant?.settings || {};
        return {
            mode: settings.ssoMode || 'alternative',
            multipassSecret: settings.multipassSecret || '',
            storefrontToken: settings.storefrontToken || '',
        };
    }
    async updateSsoSettings(merchantId, ssoSettings) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { settings: true },
        });
        const currentSettings = merchant?.settings || {};
        const updatedSettings = {
            ...currentSettings,
            ssoMode: ssoSettings.mode,
            multipassSecret: ssoSettings.multipassSecret || currentSettings.multipassSecret || '',
            storefrontToken: ssoSettings.storefrontToken || currentSettings.storefrontToken || '',
        };
        return this.prisma.merchant.update({
            where: { id: merchantId },
            data: {
                settings: updatedSettings,
                updatedAt: new Date(),
            },
        });
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map