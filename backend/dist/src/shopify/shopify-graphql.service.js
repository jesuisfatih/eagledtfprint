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
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
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
              descriptionHtml
              vendor
              productType
              tags
              status
              templateSuffix
              publishedAt
              onlineStoreUrl
              totalInventory
              hasOnlyDefaultVariant
              requiresSellingPlan
              seo {
                title
                description
              }
              options {
                id
                name
                values
                position
              }
              images(first: 20) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              media(first: 20) {
                edges {
                  node {
                    mediaContentType
                    alt
                    ... on MediaImage {
                      id
                      image {
                        url
                        altText
                        width
                        height
                      }
                    }
                    ... on Video {
                      id
                      sources {
                        url
                        mimeType
                        width
                        height
                      }
                    }
                    ... on ExternalVideo {
                      id
                      embedUrl
                    }
                  }
                }
              }
              collections(first: 10) {
                edges {
                  node {
                    id
                    title
                    handle
                  }
                }
              }
              metafields(first: 30) {
                edges {
                  node {
                    namespace
                    key
                    value
                    type
                  }
                }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    legacyResourceId
                    sku
                    barcode
                    title
                    price
                    compareAtPrice
                    inventoryQuantity
                    position
                    taxable
                    availableForSale
                    inventoryPolicy
                    image {
                      url
                      altText
                    }
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
              verifiedEmail
              emailMarketingConsent {
                marketingState
                marketingOptInLevel
              }
              taxExempt
              state
              locale
              createdAt
              updatedAt
              lastOrder {
                id
                legacyResourceId
                createdAt
              }
              addresses {
                address1
                address2
                city
                province
                provinceCode
                country
                countryCodeV2
                zip
                phone
                company
                firstName
                lastName
              }
              metafields(first: 20) {
                edges {
                  node {
                    namespace
                    key
                    value
                    type
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
    async getOrders(shop, accessToken, first = 50, cursor) {
        const query = `
      query GetOrders($first: Int!, $after: String) {
        orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
          edges {
            cursor
            node {
              id
              legacyResourceId
              name
              email
              phone
              note
              tags
              createdAt
              updatedAt
              processedAt
              cancelledAt
              closedAt
              displayFinancialStatus
              displayFulfillmentStatus
              currencyCode
              presentmentCurrencyCode
              subtotalPriceSet {
                shopMoney { amount currencyCode }
              }
              totalDiscountsSet {
                shopMoney { amount currencyCode }
              }
              totalTaxSet {
                shopMoney { amount currencyCode }
              }
              totalPriceSet {
                shopMoney { amount currencyCode }
              }
              totalShippingPriceSet {
                shopMoney { amount currencyCode }
              }
              totalRefundedSet {
                shopMoney { amount currencyCode }
              }
              customer {
                id
                legacyResourceId
                email
                firstName
                lastName
              }
              shippingAddress {
                address1
                address2
                city
                province
                country
                zip
                phone
                company
                firstName
                lastName
              }
              billingAddress {
                address1
                address2
                city
                province
                country
                zip
                phone
                company
                firstName
                lastName
              }
              discountCodes
              customAttributes {
                key
                value
              }
              shippingLine {
                title
                code
                source
              }
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    quantity
                    customAttributes {
                      key
                      value
                    }
                    image {
                      url
                    }
                    variant {
                      id
                      legacyResourceId
                      sku
                      title
                      image {
                        url
                      }
                      product {
                        id
                        legacyResourceId
                        title
                        handle
                      }
                    }
                    originalTotalSet {
                      shopMoney { amount currencyCode }
                    }
                    discountedTotalSet {
                      shopMoney { amount currencyCode }
                    }
                  }
                }
              }
              fulfillments {
                id
                status
                trackingInfo {
                  number
                  url
                  company
                }
                createdAt
                updatedAt
              }
              refunds {
                id
                createdAt
                note
                totalRefundedSet {
                  shopMoney { amount currencyCode }
                }
              }
              riskLevel
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
    async getCollections(shop, accessToken, first = 50, cursor) {
        const query = `
      query GetCollections($first: Int!, $after: String) {
        collections(first: $first, after: $after) {
          edges {
            cursor
            node {
              id
              legacyResourceId
              title
              handle
              description
              descriptionHtml
              image {
                url
                altText
                width
                height
              }
              productsCount {
                count
              }
              sortOrder
              ruleSet {
                appliedDisjunctively
                rules {
                  column
                  relation
                  condition
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
    async getDiscountCodes(shop, accessToken, first = 50, cursor) {
        const query = `
      query GetDiscountCodes($first: Int!, $after: String) {
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
                      node {
                        code
                      }
                    }
                  }
                  customerSelection {
                    ... on DiscountCustomerAll {
                      allCustomers
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
                      node {
                        code
                      }
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
                      node {
                        code
                      }
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
};
exports.ShopifyGraphqlService = ShopifyGraphqlService;
exports.ShopifyGraphqlService = ShopifyGraphqlService = ShopifyGraphqlService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        shopify_service_1.ShopifyService])
], ShopifyGraphqlService);
//# sourceMappingURL=shopify-graphql.service.js.map