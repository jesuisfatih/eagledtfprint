import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ShopifyService } from './shopify.service';

@Injectable()
export class ShopifyGraphqlService {
  private readonly logger = new Logger(ShopifyGraphqlService.name);

  constructor(
    private httpService: HttpService,
    private shopifyService: ShopifyService,
  ) {}

  async query<T>(shop: string, accessToken: string, query: string, variables?: any): Promise<T> {
    const url = `https://${shop}/admin/api/${this.shopifyService.getApiVersion()}/graphql.json`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            query,
            variables,
          },
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data.errors) {
        this.logger.error('GraphQL errors:', response.data.errors);
        throw new Error(JSON.stringify(response.data.errors));
      }

      return response.data.data as T;
    } catch (error) {
      this.logger.error('GraphQL query failed', error);
      throw error;
    }
  }

  // ===================================================
  // PRODUCTS — Ultra-detailed product query
  // ===================================================
  async getProductsWithVariants(shop: string, accessToken: string, first = 50, cursor?: string) {
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

  // ===================================================
  // CUSTOMERS — Enhanced customer query with metafields
  // ===================================================
  async getCustomers(shop: string, accessToken: string, first = 50, cursor?: string) {
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

  // ===================================================
  // ORDERS — Enhanced order query (GraphQL for richer data)
  // ===================================================
  async getOrders(shop: string, accessToken: string, first = 50, cursor?: string) {
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
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    quantity
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

  // ===================================================
  // COLLECTIONS — Sync all collections
  // ===================================================
  async getCollections(shop: string, accessToken: string, first = 50, cursor?: string) {
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

  // ===================================================
  // DISCOUNTS — Sync all discount codes
  // ===================================================
  async getDiscountCodes(shop: string, accessToken: string, first = 50, cursor?: string) {
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
}
