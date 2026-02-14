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
var ShopifyRestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyRestService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const shopify_service_1 = require("./shopify.service");
let ShopifyRestService = ShopifyRestService_1 = class ShopifyRestService {
    httpService;
    shopifyService;
    logger = new common_1.Logger(ShopifyRestService_1.name);
    constructor(httpService, shopifyService) {
        this.httpService = httpService;
        this.shopifyService = shopifyService;
    }
    async get(shop, accessToken, path) {
        const url = this.shopifyService.buildAdminApiUrl(shop, path);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`REST GET failed: ${url}`, error.response?.data);
            throw error;
        }
    }
    async post(shop, accessToken, path, data) {
        const url = this.shopifyService.buildAdminApiUrl(shop, path);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, data, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`REST POST failed: ${url}`, error.response?.data);
            throw error;
        }
    }
    async put(shop, accessToken, path, data) {
        const url = this.shopifyService.buildAdminApiUrl(shop, path);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.put(url, data, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`REST PUT failed: ${url}`, error.response?.data);
            throw error;
        }
    }
    async delete(shop, accessToken, path) {
        const url = this.shopifyService.buildAdminApiUrl(shop, path);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.delete(url, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`REST DELETE failed: ${url}`, error.response?.data);
            throw error;
        }
    }
    async getCustomers(shop, accessToken, limit = 250) {
        return this.get(shop, accessToken, `/customers.json?limit=${limit}`);
    }
    async createCustomerInvite(shop, accessToken, customerId) {
        const url = this.shopifyService.buildAdminApiUrl(shop, `/customers/${customerId}/send_invite.json`);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                customer_invite: {
                    to: '',
                    from: '',
                    subject: 'Welcome to our store',
                    custom_message: 'Please login to complete your purchase',
                },
            }, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`Customer invite failed: ${url}`, error.response?.data);
            throw error;
        }
    }
    async updateCustomerSubscription(shop, accessToken, customerId, acceptsMarketing) {
        const url = this.shopifyService.buildAdminApiUrl(shop, `/customers/${customerId}.json`);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.put(url, {
                customer: {
                    accepts_marketing: acceptsMarketing,
                },
            }, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`Customer subscription update failed: ${url}`, error.response?.data);
            throw error;
        }
    }
    async updateCustomerMetafields(shop, accessToken, customerId, metafields) {
        const getUrl = this.shopifyService.buildAdminApiUrl(shop, `/customers/${customerId}/metafields.json`);
        try {
            const existingResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.get(getUrl, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            const existingMetafields = existingResponse.data.metafields || [];
            for (const metafield of existingMetafields) {
                if (metafields.some(m => m.namespace === metafield.namespace && m.key === metafield.key)) {
                    await (0, rxjs_1.firstValueFrom)(this.httpService.delete(this.shopifyService.buildAdminApiUrl(shop, `/metafields/${metafield.id}.json`), {
                        headers: {
                            'X-Shopify-Access-Token': accessToken,
                            'Content-Type': 'application/json',
                        },
                    }));
                }
            }
            const createUrl = this.shopifyService.buildAdminApiUrl(shop, '/metafields.json');
            const results = [];
            for (const metafield of metafields) {
                const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(createUrl, {
                    metafield: {
                        namespace: metafield.namespace,
                        key: metafield.key,
                        value: metafield.value,
                        type: metafield.type,
                        owner_resource: 'customer',
                        owner_id: customerId,
                    },
                }, {
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json',
                    },
                }));
                if (response.data?.metafield) {
                    results.push(response.data.metafield);
                }
            }
            return results;
        }
        catch (error) {
            this.logger.error(`Metafield update failed: ${getUrl}`, error.response?.data);
            throw error;
        }
    }
    async getCustomerMetafields(shop, accessToken, customerId) {
        const url = this.shopifyService.buildAdminApiUrl(shop, `/customers/${customerId}/metafields.json`);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data.metafields || [];
        }
        catch (error) {
            this.logger.error(`Get metafields failed: ${url}`, error.response?.data);
            return [];
        }
    }
    async getProducts(shop, accessToken, limit = 250) {
        return this.get(shop, accessToken, `/products.json?limit=${limit}`);
    }
    async getOrders(shop, accessToken, limit = 250) {
        return this.get(shop, accessToken, `/orders.json?limit=${limit}&status=any`);
    }
};
exports.ShopifyRestService = ShopifyRestService;
exports.ShopifyRestService = ShopifyRestService = ShopifyRestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        shopify_service_1.ShopifyService])
], ShopifyRestService);
//# sourceMappingURL=shopify-rest.service.js.map