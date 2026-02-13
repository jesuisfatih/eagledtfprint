import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ShopifyService } from './shopify.service';

@Injectable()
export class ShopifyAdminDiscountService {
  private readonly logger = new Logger(ShopifyAdminDiscountService.name);

  constructor(
    private httpService: HttpService,
    private shopifyService: ShopifyService,
  ) {}

  /**
   * Fetch all active discount codes from Shopify
   */
  async fetchAllDiscountCodes(shop: string, accessToken: string) {
    const url = this.shopifyService.buildAdminGraphQLUrl(shop);
    const allDiscounts: any[] = [];
    let cursor: string | null = null;
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

      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { query, variables: { first: 50, after: cursor } },
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data.data?.codeDiscountNodes;
      const edges = data?.edges || [];

      for (const edge of edges) {
        const discount = edge.node?.codeDiscount;
        if (discount) {
          allDiscounts.push({
            shopifyId: edge.node.id,
            title: discount.title,
            status: discount.status,
            codes: discount.codes?.edges?.map((e: any) => e.node.code) || [],
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

  /**
   * Fetch automatic discounts from Shopify
   */
  async fetchAutoDiscounts(shop: string, accessToken: string) {
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

    const response = await firstValueFrom(
      this.httpService.post(
        url,
        { query, variables: { first: 50 } },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const edges = response.data.data?.automaticDiscountNodes?.edges || [];
    return edges.map((e: any) => ({
      shopifyId: e.node.id,
      type: 'automatic',
      ...e.node.automaticDiscount,
    }));
  }

  /**
   * Create a basic discount code using Shopify Admin GraphQL API
   * Uses discountCodeBasicCreate mutation (replaces deprecated REST Price Rules)
   */
  async createDiscountCode(
    shop: string,
    accessToken: string,
    code: string,
    value: number,
    valueType: 'fixed_amount' | 'percentage',
    options?: {
      title?: string;
      endsAt?: string;
      usageLimit?: number;
      appliesOncePerCustomer?: boolean;
      minimumAmount?: number;
      customerIds?: string[];
    },
  ) {
    const url = this.shopifyService.buildAdminGraphQLUrl(shop);

    // Build the discount value based on type
    const customerGets = valueType === 'percentage'
      ? {
          value: {
            percentage: value / 100, // Shopify expects decimal (0.1 for 10%)
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

    // Build customer selection
    const customerSelection: any = options?.customerIds?.length
      ? { customers: { add: options.customerIds } }
      : { all: true };

    // Build minimum requirement
    const minimumRequirement: any = options?.minimumAmount
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

    const variables: any = {
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
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { query: mutation, variables },
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

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
    } catch (error) {
      this.logger.error('Failed to create Shopify discount', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create a customer-specific discount (personalized offer)
   */
  async createCustomerDiscount(
    shop: string,
    accessToken: string,
    params: {
      code: string;
      title: string;
      percentage: number;
      customerGid: string; // Shopify customer GID
      expiresInHours?: number;
      minimumAmount?: number;
    },
  ) {
    return this.createDiscountCode(
      shop,
      accessToken,
      params.code,
      params.percentage,
      'percentage',
      {
        title: params.title,
        endsAt: new Date(Date.now() + (params.expiresInHours || 72) * 60 * 60 * 1000).toISOString(),
        usageLimit: 1,
        appliesOncePerCustomer: true,
        minimumAmount: params.minimumAmount,
        customerIds: [params.customerGid],
      },
    );
  }

  /**
   * Delete a discount code (cleanup after use)
   */
  async deleteDiscountCode(
    shop: string,
    accessToken: string,
    discountId: string,
  ) {
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
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { query: mutation, variables: { id: discountId } },
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const result = response.data.data?.discountCodeDelete;

      if (result?.userErrors?.length > 0) {
        this.logger.warn('Discount deletion had errors', result.userErrors);
      }

      this.logger.log(`Deleted Shopify discount: ${discountId}`);
      return result?.deletedCodeDiscountId;
    } catch (error) {
      this.logger.error('Failed to delete Shopify discount', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get discount analytics (usage, revenue impact)
   */
  async getDiscountAnalytics(shop: string, accessToken: string, discountId: string) {
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

    const response = await firstValueFrom(
      this.httpService.post(
        url,
        { query, variables: { id: discountId } },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    return response.data.data?.codeDiscountNode;
  }
}
