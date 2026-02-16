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
    async fetchAllDiscountCodes(shop, accessToken) {
        const url = this.shopifyService.buildAdminGraphQLUrl(shop);
        const allDiscounts = [];
        let cursor = null;
        let hasNextPage = true;
        while (hasNextPage) {
            const query = `
        query GetDiscounts($first: Int!, $after: String) {
          codeDiscountNodes(first: $first, after: $after) {
            edges {
              cursor
              node {
                id
                codeDiscount {
                  ... on DiscountCodeBasic {
                    title
                    status
                    startsAt
                    endsAt
                    usageLimit
                    asyncUsageCount
                    appliesOncePerCustomer
                    combinesWith {
                      orderDiscounts
                      productDiscounts
                      shippingDiscounts
                    }
                    customerGets {
                      value {
                        ... on DiscountPercentage {
                          percentage
                        }
                        ... on DiscountAmount {
                          amount { amount currencyCode }
                          appliesOnEachItem
                        }
                      }
                    }
                    codes(first: 5) {
                      edges {
                        node { code }
                      }
                    }
                    customerSelection {
                      ... on DiscountCustomerAll { allCustomers }
                    }
                    minimumRequirement {
                      ... on DiscountMinimumSubtotal {
                        greaterThanOrEqualToSubtotal { amount currencyCode }
                      }
                      ... on DiscountMinimumQuantity {
                        greaterThanOrEqualToQuantity
                      }
                    }
                  }
                  ... on DiscountCodeBxgy {
                    title
                    status
                    startsAt
                    endsAt
                    usageLimit
                    asyncUsageCount
                    codes(first: 5) {
                      edges {
                        node { code }
                      }
                    }
                  }
                  ... on DiscountCodeFreeShipping {
                    title
                    status
                    startsAt
                    endsAt
                    usageLimit
                    asyncUsageCount
                    codes(first: 5) {
                      edges {
                        node { code }
                      }
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, { query, variables: { first: 50, after: cursor } }, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            const data = response.data.data?.codeDiscountNodes;
            const edges = data?.edges || [];
            for (const edge of edges) {
                const discount = edge.node?.codeDiscount;
                if (discount) {
                    allDiscounts.push({
                        shopifyId: edge.node.id,
                        title: discount.title,
                        status: discount.status,
                        codes: discount.codes?.edges?.map((e) => e.node.code) || [],
                        startsAt: discount.startsAt,
                        endsAt: discount.endsAt,
                        usageLimit: discount.usageLimit,
                        usageCount: discount.asyncUsageCount,
                        appliesOncePerCustomer: discount.appliesOncePerCustomer,
                        combinesWith: discount.combinesWith,
                        value: discount.customerGets?.value,
                        minimumRequirement: discount.minimumRequirement,
                    });
                }
            }
            hasNextPage = data?.pageInfo?.hasNextPage || false;
            cursor = data?.pageInfo?.endCursor || null;
        }
        this.logger.log(`Fetched ${allDiscounts.length} discount codes from ${shop}`);
        return allDiscounts;
    }
    async fetchAutoDiscounts(shop, accessToken) {
        const url = this.shopifyService.buildAdminGraphQLUrl(shop);
        const query = `
      query GetAutoDiscounts($first: Int!) {
        automaticDiscountNodes(first: $first) {
          edges {
            node {
              id
              automaticDiscount {
                ... on DiscountAutomaticBasic {
                  title
                  status
                  startsAt
                  endsAt
                  minimumRequirement {
                    ... on DiscountMinimumSubtotal {
                      greaterThanOrEqualToSubtotal { amount currencyCode }
                    }
                    ... on DiscountMinimumQuantity {
                      greaterThanOrEqualToQuantity
                    }
                  }
                  customerGets {
                    value {
                      ... on DiscountPercentage {
                        percentage
                      }
                      ... on DiscountAmount {
                        amount { amount currencyCode }
                        appliesOnEachItem
                      }
                    }
                  }
                }
                ... on DiscountAutomaticBxgy {
                  title
                  status
                  startsAt
                  endsAt
                }
                ... on DiscountAutomaticFreeShipping {
                  title
                  status
                  startsAt
                  endsAt
                }
              }
            }
          }
        }
      }
    `;
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, { query, variables: { first: 50 } }, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        }));
        const edges = response.data.data?.automaticDiscountNodes?.edges || [];
        return edges.map((e) => ({
            shopifyId: e.node.id,
            type: 'automatic',
            ...e.node.automaticDiscount,
        }));
    }
    async createDiscountCode(shop, accessToken, code, value, valueType, options) {
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
        const customerSelection = options?.customerIds?.length
            ? { customers: { add: options.customerIds } }
            : { all: true };
        const minimumRequirement = options?.minimumAmount
            ? { subtotal: { greaterThanOrEqualToSubtotal: options.minimumAmount.toString() } }
            : undefined;
        const mutation = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                status
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
                title: options?.title || `Eagle System - ${code}`,
                code: code,
                startsAt: new Date().toISOString(),
                endsAt: options?.endsAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                usageLimit: options?.usageLimit ?? 1,
                appliesOncePerCustomer: options?.appliesOncePerCustomer ?? false,
                customerSelection,
                customerGets,
                combinesWith: {
                    orderDiscounts: false,
                    productDiscounts: false,
                    shippingDiscounts: true,
                },
            },
        };
        if (minimumRequirement) {
            variables.basicCodeDiscount.minimumRequirement = minimumRequirement;
        }
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
                status: discountNode?.codeDiscount?.status,
            };
        }
        catch (error) {
            this.logger.error('Failed to create Shopify discount', error.response?.data || error.message);
            throw error;
        }
    }
    async createCustomerDiscount(shop, accessToken, params) {
        return this.createDiscountCode(shop, accessToken, params.code, params.percentage, 'percentage', {
            title: params.title,
            endsAt: new Date(Date.now() + (params.expiresInHours || 72) * 60 * 60 * 1000).toISOString(),
            usageLimit: 1,
            appliesOncePerCustomer: true,
            minimumAmount: params.minimumAmount,
            customerIds: [params.customerGid],
        });
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
    async getDiscountAnalytics(shop, accessToken, discountId) {
        const url = this.shopifyService.buildAdminGraphQLUrl(shop);
        const query = `
      query GetDiscountDetail($id: ID!) {
        codeDiscountNode(id: $id) {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              status
              asyncUsageCount
              startsAt
              endsAt
              codes(first: 10) {
                edges {
                  node {
                    code
                    asyncUsageCount
                  }
                }
              }
            }
          }
        }
      }
    `;
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, { query, variables: { id: discountId } }, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        }));
        return response.data.data?.codeDiscountNode;
    }
};
exports.ShopifyAdminDiscountService = ShopifyAdminDiscountService;
exports.ShopifyAdminDiscountService = ShopifyAdminDiscountService = ShopifyAdminDiscountService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        shopify_service_1.ShopifyService])
], ShopifyAdminDiscountService);
//# sourceMappingURL=shopify-admin-discount.service.js.map