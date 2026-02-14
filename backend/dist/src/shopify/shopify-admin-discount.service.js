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
var ShopifyAdminDiscountService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyAdminDiscountService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const shopify_service_1 = require("./shopify.service");
let ShopifyAdminDiscountService = ShopifyAdminDiscountService_1 = class ShopifyAdminDiscountService {
    httpService;
    shopifyService;
    logger = new common_1.Logger(ShopifyAdminDiscountService_1.name);
    constructor(httpService, shopifyService) {
        this.httpService = httpService;
        this.shopifyService = shopifyService;
    }
    async createDiscountCode(shop, accessToken, code, value, valueType) {
        const url = this.shopifyService.buildAdminGraphQLUrl(shop);
        const customerGets = valueType === 'percentage'
            ? {
                value: {
                    percentage: value / 100,
                },
                items: {
                    all: true,
                },
            }
            : {
                value: {
                    discountAmount: {
                        amount: value.toString(),
                        appliesOnEachItem: false,
                    },
                },
                items: {
                    all: true,
                },
            };
        const mutation = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                codes(first: 1) {
                  nodes {
                    code
                    id
                  }
                }
              }
            }
          }
          userErrors {
            field
            code
            message
          }
        }
      }
    `;
        const variables = {
            basicCodeDiscount: {
                title: `Eagle B2B - ${code}`,
                code: code,
                startsAt: new Date().toISOString(),
                endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                usageLimit: 1,
                appliesOncePerCustomer: false,
                customerSelection: {
                    all: true,
                },
                customerGets,
                combinesWith: {
                    orderDiscounts: false,
                    productDiscounts: false,
                    shippingDiscounts: true,
                },
            },
        };
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, { query: mutation, variables }, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            const result = response.data.data?.discountCodeBasicCreate;
            if (result?.userErrors?.length > 0) {
                this.logger.error('Shopify discount creation failed', result.userErrors);
                throw new Error(`Discount creation failed: ${result.userErrors[0].message}`);
            }
            const discountNode = result?.codeDiscountNode;
            this.logger.log(`Created Shopify discount: ${code}`);
            return {
                discountId: discountNode?.id,
                discountCodeId: discountNode?.codeDiscount?.codes?.nodes?.[0]?.id,
                code,
            };
        }
        catch (error) {
            this.logger.error('Failed to create Shopify discount', error.response?.data || error.message);
            throw error;
        }
    }
    async deleteDiscountCode(shop, accessToken, discountId) {
        const url = this.shopifyService.buildAdminGraphQLUrl(shop);
        const mutation = `
      mutation discountCodeDelete($id: ID!) {
        discountCodeDelete(id: $id) {
          deletedCodeDiscountId
          userErrors {
            field
            code
            message
          }
        }
      }
    `;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, { query: mutation, variables: { id: discountId } }, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            const result = response.data.data?.discountCodeDelete;
            if (result?.userErrors?.length > 0) {
                this.logger.warn('Discount deletion had errors', result.userErrors);
            }
            this.logger.log(`Deleted Shopify discount: ${discountId}`);
            return result?.deletedCodeDiscountId;
        }
        catch (error) {
            this.logger.error('Failed to delete Shopify discount', error.response?.data || error.message);
            throw error;
        }
    }
};
exports.ShopifyAdminDiscountService = ShopifyAdminDiscountService;
exports.ShopifyAdminDiscountService = ShopifyAdminDiscountService = ShopifyAdminDiscountService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        shopify_service_1.ShopifyService])
], ShopifyAdminDiscountService);
//# sourceMappingURL=shopify-admin-discount.service.js.map