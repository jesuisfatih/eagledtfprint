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
var ShopifyCompanySyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyCompanySyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const shopify_customer_sync_service_1 = require("../shopify/shopify-customer-sync.service");
let ShopifyCompanySyncService = ShopifyCompanySyncService_1 = class ShopifyCompanySyncService {
    prisma;
    shopifyCustomerSync;
    logger = new common_1.Logger(ShopifyCompanySyncService_1.name);
    constructor(prisma, shopifyCustomerSync) {
        this.prisma = prisma;
        this.shopifyCustomerSync = shopifyCustomerSync;
    }
    async syncCompanyToShopify(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            include: {
                users: { where: { role: 'admin' }, take: 1 },
            },
        });
        if (!company || company.users.length === 0)
            return;
        const adminUser = company.users[0];
        try {
            await this.shopifyCustomerSync.syncUserToShopify(adminUser.id);
            this.logger.log(`Company ${company.name} synced to Shopify via user ${adminUser.email}`);
        }
        catch (error) {
            this.logger.error('Company sync to Shopify failed', error);
        }
    }
    async updateCompanyInShopify(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            include: {
                users: true,
            },
        });
        if (!company)
            return;
        for (const user of company.users) {
            if (user.shopifyCustomerId) {
                try {
                    await this.shopifyCustomerSync.updateShopifyCustomer(user.id);
                }
                catch (error) {
                    this.logger.error(`Failed to update user ${user.email} in Shopify`, error);
                }
            }
        }
    }
};
exports.ShopifyCompanySyncService = ShopifyCompanySyncService;
exports.ShopifyCompanySyncService = ShopifyCompanySyncService = ShopifyCompanySyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_customer_sync_service_1.ShopifyCustomerSyncService])
], ShopifyCompanySyncService);
//# sourceMappingURL=shopify-company-sync.service.js.map