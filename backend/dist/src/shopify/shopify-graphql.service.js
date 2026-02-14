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
var ShopifyGraphqlService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyGraphqlService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const shopify_service_1 = require("./shopify.service");
let ShopifyGraphqlService = ShopifyGraphqlService_1 = class ShopifyGraphqlService {
    httpService;
    shopifyService;
    logger = new common_1.Logger(ShopifyGraphqlService_1.name);
    constructor(httpService, shopifyService) {
        this.httpService = httpService;
        this.shopifyService = shopifyService;
    }
    async query(shop, accessToken, query, variables) {
        const url = `https://${shop}/admin/api/${this.shopifyService.getApiVersion()}/graphql.json`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                query,
                variables,
            }, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }));
            if (response.data.errors) {
                this.logger.error('GraphQL errors:', response.data.errors);
                throw new Error(JSON.stringify(response.data.errors));
            }
            return response.data.data;
        }
        catch (error) {
            this.logger.error('GraphQL query failed', error);
            throw error;
        }
    }
    async getProductsWithVariants(shop, accessToken, first = 50, cursor) {
        const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            cursor
            node {
              id
              legacyResourceId
              title
              handle
              description
              vendor
              productType
              tags
              status
              images(first: 10) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    legacyResourceId
                    sku
                    title
                    price
                    compareAtPrice
                    inventoryQuantity
                    selectedOptions {
                      name
                      value
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
        return this.query(shop, accessToken, query, { first, after: cursor });
    }
    async getCustomers(shop, accessToken, first = 50, cursor) {
        const query = `
      query GetCustomers($first: Int!, $after: String) {
        customers(first: $first, after: $after) {
          edges {
            cursor
            node {
              id
              legacyResourceId
              email
              firstName
              lastName
              phone
              tags
              note
              numberOfOrders
              amountSpent {
                amount
                currencyCode
              }
              addresses {
                address1
                address2
                city
                province
                country
                zip
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
        return this.query(shop, accessToken, query, { first, after: cursor });
    }
};
exports.ShopifyGraphqlService = ShopifyGraphqlService;
exports.ShopifyGraphqlService = ShopifyGraphqlService = ShopifyGraphqlService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        shopify_service_1.ShopifyService])
], ShopifyGraphqlService);
//# sourceMappingURL=shopify-graphql.service.js.map