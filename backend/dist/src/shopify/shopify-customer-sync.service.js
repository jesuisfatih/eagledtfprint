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
var ShopifyCustomerSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyCustomerSyncService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const shopify_service_1 = require("./shopify.service");
const prisma_service_1 = require("../prisma/prisma.service");
let ShopifyCustomerSyncService = ShopifyCustomerSyncService_1 = class ShopifyCustomerSyncService {
    httpService;
    shopifyService;
    prisma;
    logger = new common_1.Logger(ShopifyCustomerSyncService_1.name);
    constructor(httpService, shopifyService, prisma) {
        this.httpService = httpService;
        this.shopifyService = shopifyService;
        this.prisma = prisma;
    }
    async syncUserToShopify(userId) {
        this.logger.log(`🔄 syncUserToShopify called for userId: ${userId}`);
        const user = await this.prisma.companyUser.findUnique({
            where: { id: userId },
            include: { company: true },
        });
        if (!user) {
            this.logger.warn(`⚠️ syncUserToShopify: User not found (ID: ${userId})`);
            throw new Error(`User not found: ${userId}`);
        }
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: user.company.merchantId },
        });
        if (!merchant) {
            this.logger.warn(`⚠️ syncUserToShopify: Merchant not found for user ${user.email} (merchantId: ${user.company.merchantId})`);
            throw new Error(`Merchant not found for user ${user.email}`);
        }
        this.logger.log(`🔄 syncUserToShopify: Starting sync for user ${user.email}`, {
            userId,
            merchantId: merchant.id,
            shopDomain: merchant.shopDomain,
        });
        try {
            if (user.shopifyCustomerId) {
                this.logger.log(`User ${user.email} already has Shopify customer ID: ${user.shopifyCustomerId}`);
                return await this.updateShopifyCustomer(userId);
            }
            const permissions = user.permissions || {};
            const emailVerified = permissions.emailVerified || false;
            const formatPhone = (phone) => {
                if (!phone)
                    return '';
                let cleaned = phone.replace(/[^\d+]/g, '');
                if (cleaned && !cleaned.startsWith('+')) {
                    if (cleaned.startsWith('1') && cleaned.length === 11) {
                        cleaned = '+' + cleaned;
                    }
                    else if (cleaned.length === 10) {
                        cleaned = '+1' + cleaned;
                    }
                    else {
                        cleaned = '+' + cleaned;
                    }
                }
                return cleaned;
            };
            const formatAddress = (address, userData) => {
                if (!address)
                    return [];
                const formattedPhone = formatPhone(userData.company.phone);
                return [{
                        address1: address.address1 || address.street || '',
                        address2: address.address2 || '',
                        city: address.city || '',
                        province: address.province || address.state || '',
                        country: address.country || 'Turkey',
                        zip: address.zip || address.postalCode || '',
                        phone: formattedPhone,
                        first_name: userData.firstName || '',
                        last_name: userData.lastName || '',
                    }];
            };
            const formattedPhone = formatPhone(user.company.phone);
            const customerData = {
                customer: {
                    email: user.email,
                    first_name: user.firstName || '',
                    last_name: user.lastName || '',
                    phone: formattedPhone,
                    addresses: formatAddress(user.company.billingAddress, user),
                    tags: [`eagle-b2b-user`, `company-${user.companyId}`],
                    accepts_marketing: emailVerified,
                },
            };
            const url = this.shopifyService.buildAdminApiUrl(merchant.shopDomain, '/customers.json');
            this.logger.log(`Creating Shopify customer for ${user.email}`, {
                email: user.email,
                emailVerified,
                shopDomain: merchant.shopDomain,
            });
            let response;
            try {
                response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, customerData, {
                    headers: {
                        'X-Shopify-Access-Token': merchant.accessToken,
                        'Content-Type': 'application/json',
                    },
                }));
            }
            catch (createError) {
                if (createError.response?.status === 422 || createError.response?.data?.errors?.email) {
                    this.logger.warn(`Customer ${user.email} already exists in Shopify, searching...`);
                    const searchUrl = this.shopifyService.buildAdminApiUrl(merchant.shopDomain, `/customers/search.json?query=email:${encodeURIComponent(user.email)}`);
                    const searchResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.get(searchUrl, {
                        headers: {
                            'X-Shopify-Access-Token': merchant.accessToken,
                        },
                    }));
                    if (searchResponse.data.customers && searchResponse.data.customers.length > 0) {
                        const existingCustomer = searchResponse.data.customers[0];
                        this.logger.log(`Found existing Shopify customer: ${existingCustomer.id}`);
                        await this.prisma.companyUser.update({
                            where: { id: userId },
                            data: {
                                shopifyCustomerId: BigInt(existingCustomer.id),
                            },
                        });
                        return await this.updateShopifyCustomer(userId);
                    }
                    else {
                        throw createError;
                    }
                }
                else {
                    throw createError;
                }
            }
            await this.prisma.companyUser.update({
                where: { id: userId },
                data: {
                    shopifyCustomerId: BigInt(response.data.customer.id),
                },
            });
            this.logger.log(`✅ User ${user.email} synced to Shopify successfully`, {
                shopifyCustomerId: response.data.customer.id,
                email: user.email,
            });
            return response.data.customer;
        }
        catch (error) {
            this.logger.error(`❌ Failed to sync user ${user.email} to Shopify`, {
                error: error.message,
                stack: error.stack,
                response: error.response?.data,
                status: error.response?.status,
                url: error.config?.url,
            });
            throw error;
        }
    }
    async updateShopifyCustomer(userId) {
        const user = await this.prisma.companyUser.findUnique({
            where: { id: userId },
            include: { company: true },
        });
        if (!user || !user.shopifyCustomerId)
            return;
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: user.company.merchantId },
        });
        if (!merchant)
            return;
        try {
            const url = this.shopifyService.buildAdminApiUrl(merchant.shopDomain, `/customers/${user.shopifyCustomerId}.json`);
            const permissions = user.permissions || {};
            const emailVerified = permissions.emailVerified || false;
            const customerData = {
                customer: {
                    email: user.email,
                    first_name: user.firstName,
                    last_name: user.lastName,
                    phone: user.company.phone,
                    accepts_marketing: emailVerified,
                },
            };
            await (0, rxjs_1.firstValueFrom)(this.httpService.put(url, customerData, {
                headers: {
                    'X-Shopify-Access-Token': merchant.accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            this.logger.log(`Shopify customer updated for ${user.email}`);
        }
        catch (error) {
            this.logger.error('Failed to update Shopify customer', error);
        }
    }
};
exports.ShopifyCustomerSyncService = ShopifyCustomerSyncService;
exports.ShopifyCustomerSyncService = ShopifyCustomerSyncService = ShopifyCustomerSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        shopify_service_1.ShopifyService,
        prisma_service_1.PrismaService])
], ShopifyCustomerSyncService);
//# sourceMappingURL=shopify-customer-sync.service.js.map