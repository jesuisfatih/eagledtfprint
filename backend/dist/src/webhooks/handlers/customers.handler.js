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
var CustomersHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersHandler = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shopify_service_1 = require("../../shopify/shopify.service");
let CustomersHandler = CustomersHandler_1 = class CustomersHandler {
    prisma;
    shopifyService;
    logger = new common_1.Logger(CustomersHandler_1.name);
    constructor(prisma, shopifyService) {
        this.prisma = prisma;
        this.shopifyService = shopifyService;
    }
    async handleCustomerCreate(customerData, headers) {
        try {
            const shop = headers['x-shopify-shop-domain'];
            const merchant = await this.shopifyService.getMerchantByShopDomain(shop);
            if (!merchant) {
                this.logger.warn(`Merchant not found for shop: ${shop}`);
                return { success: false };
            }
            await this.prisma.shopifyCustomer.upsert({
                where: {
                    merchantId_shopifyCustomerId: {
                        merchantId: merchant.id,
                        shopifyCustomerId: BigInt(customerData.id),
                    },
                },
                create: {
                    merchantId: merchant.id,
                    shopifyCustomerId: BigInt(customerData.id),
                    email: customerData.email,
                    firstName: customerData.first_name,
                    lastName: customerData.last_name,
                    phone: customerData.phone,
                    tags: customerData.tags,
                    note: customerData.note,
                    totalSpent: parseFloat(customerData.total_spent || '0'),
                    ordersCount: customerData.orders_count || 0,
                    addresses: customerData.addresses || [],
                    rawData: customerData,
                },
                update: {
                    email: customerData.email,
                    firstName: customerData.first_name,
                    lastName: customerData.last_name,
                    phone: customerData.phone,
                    tags: customerData.tags,
                    note: customerData.note,
                    totalSpent: parseFloat(customerData.total_spent || '0'),
                    ordersCount: customerData.orders_count || 0,
                    addresses: customerData.addresses || [],
                    rawData: customerData,
                    syncedAt: new Date(),
                },
            });
            this.logger.log(`Customer synced: ${customerData.email}`);
            return { success: true };
        }
        catch (error) {
            this.logger.error('Failed to handle customer create', error);
            return { success: false };
        }
    }
};
exports.CustomersHandler = CustomersHandler;
exports.CustomersHandler = CustomersHandler = CustomersHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_service_1.ShopifyService])
], CustomersHandler);
//# sourceMappingURL=customers.handler.js.map