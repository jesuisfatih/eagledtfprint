import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface CartLineItem {
  merchandiseId: string; // Shopify variant GID
  quantity: number;
}

interface DeliveryAddress {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

interface BuyerIdentity {
  email: string;
  phone?: string;
  countryCode?: string;
  customerAccessToken?: string;
  deliveryAddress?: DeliveryAddress; // Single address for convenience
}

interface CartAttribute {
  key: string;
  value: string;
}

@Injectable()
export class ShopifyStorefrontService {
  private readonly logger = new Logger(ShopifyStorefrontService.name);
  private readonly apiVersion = '2025-10'; // Latest stable version

  constructor(
    private httpService: HttpService,
    private config: ConfigService,
  ) {}

  private buildStorefrontUrl(shop: string): string {
    return `https://${shop}/api/${this.apiVersion}/graphql.json`;
  }

  /**
   * Step 1: Create cart with lines and buyer identity (email, phone, countryCode)
   */
  async createCart(
    shop: string,
    storefrontAccessToken: string,
    lines: CartLineItem[],
    buyerIdentity?: { email?: string; phone?: string; countryCode?: string; customerAccessToken?: string },
    discountCodes?: string[],
    attributes?: CartAttribute[],
    note?: string,
  ) {
    const url = this.buildStorefrontUrl(shop);

    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
            }
            buyerIdentity {
              email
              phone
              countryCode
            }
            discountCodes {
              code
              applicable
            }
          }
          userErrors {
            field
            message
            code
          }
          warnings {
            code
            message
          }
        }
      }
    `;

    const input: any = { lines };
    
    if (buyerIdentity) {
      input.buyerIdentity = {};
      // NOTE: email and phone can ONLY be set with customerAccessToken in Storefront API
      // Without customerAccessToken, these fields cause validation errors
      if (buyerIdentity.customerAccessToken) {
        input.buyerIdentity.customerAccessToken = buyerIdentity.customerAccessToken;
        // Email and phone can be included when customerAccessToken is present
        if (buyerIdentity.email) input.buyerIdentity.email = buyerIdentity.email;
        if (buyerIdentity.phone) input.buyerIdentity.phone = buyerIdentity.phone;
      }
      // Only countryCode can be set without customerAccessToken
      if (buyerIdentity.countryCode) input.buyerIdentity.countryCode = buyerIdentity.countryCode;
    }
    
    if (discountCodes && discountCodes.length > 0) {
      input.discountCodes = discountCodes;
    }
    
    if (attributes && attributes.length > 0) {
      input.attributes = attributes;
    }
    
    if (note) {
      input.note = note;
    }

    this.logger.log('Creating Shopify cart', { shop, linesCount: lines.length, email: buyerIdentity?.email });

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { query: mutation, variables: { input } },
          {
            headers: {
              'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data.errors) {
        this.logger.error('Storefront API errors:', response.data.errors);
        throw new Error(`Storefront API Error: ${JSON.stringify(response.data.errors)}`);
      }

      const result = response.data.data.cartCreate;
      
      if (result.userErrors?.length > 0) {
        this.logger.error('Cart creation userErrors:', result.userErrors);
        throw new Error(`Cart creation failed: ${result.userErrors[0].message}`);
      }
      
      if (result.warnings?.length > 0) {
        result.warnings.forEach((w: any) => this.logger.warn(`Cart warning: ${w.code} - ${w.message}`));
      }

      const cart = result.cart;
      this.logger.log(`✅ Created Shopify cart: ${cart.id}`, { checkoutUrl: cart.checkoutUrl });

      return {
        cartId: cart.id,
        checkoutUrl: cart.checkoutUrl,
        total: cart.cost.totalAmount.amount,
        currency: cart.cost.totalAmount.currencyCode,
        discountCodes: cart.discountCodes,
      };
    } catch (error) {
      this.logger.error('Failed to create Shopify cart', error);
      throw error;
    }
  }

  /**
   * Step 2: Add delivery address to cart (2025-01+ method)
   * This is the NEW way to add addresses - deliveryAddressPreferences is deprecated
   */
  async addDeliveryAddress(
    shop: string,
    storefrontAccessToken: string,
    cartId: string,
    address: DeliveryAddress,
  ) {
    const url = this.buildStorefrontUrl(shop);

    const mutation = `
      mutation cartDeliveryAddressesAdd($cartId: ID!, $addresses: [CartSelectableAddressInput!]!) {
        cartDeliveryAddressesAdd(cartId: $cartId, addresses: $addresses) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;

    const variables = {
      cartId,
      addresses: [
        {
          address: {
            firstName: address.firstName || '',
            lastName: address.lastName || '',
            company: address.company || '',
            address1: address.address1,
            address2: address.address2 || '',
            city: address.city,
            province: address.province || '',
            country: address.country, // ISO country code: US, TR, DE, etc.
            zip: address.zip,
            phone: address.phone || '',
          },
          selected: true,
        },
      ],
    };

    this.logger.log('Adding delivery address to cart', { cartId, city: address.city, country: address.country });

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { query: mutation, variables },
          {
            headers: {
              'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data.errors) {
        this.logger.error('Delivery address add errors:', response.data.errors);
        throw new Error(`Storefront API Error: ${JSON.stringify(response.data.errors)}`);
      }

      const result = response.data.data.cartDeliveryAddressesAdd;
      
      if (result.userErrors?.length > 0) {
        this.logger.error('Delivery address userErrors:', result.userErrors);
        throw new Error(`Delivery address add failed: ${result.userErrors[0].message}`);
      }

      this.logger.log(`✅ Added delivery address to cart: ${cartId}`);
      return {
        cartId: result.cart.id,
        checkoutUrl: result.cart.checkoutUrl,
      };
    } catch (error) {
      this.logger.error('Failed to add delivery address', error);
      throw error;
    }
  }

  /**
   * Create customer access token for authenticated checkout
   * This allows checkout to be pre-filled with customer data
   */
  async createCustomerAccessToken(
    shop: string,
    storefrontAccessToken: string,
    email: string,
    password: string,
  ): Promise<string | null> {
    const url = this.buildStorefrontUrl(shop);

    const mutation = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        email,
        password,
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            query: mutation,
            variables,
          },
          {
            headers: {
              'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data.errors) {
        this.logger.error('Customer access token creation errors:', response.data.errors);
        return null;
      }

      const result = response.data.data.customerAccessTokenCreate;
      
      if (result.userErrors && result.userErrors.length > 0) {
        this.logger.error('Customer access token user errors:', result.userErrors);
        return null;
      }

      if (result.customerAccessToken) {
        this.logger.log('Customer access token created successfully');
        return result.customerAccessToken.accessToken;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to create customer access token', error);
      return null;
    }
  }

  /**
   * ⭐ ANA METOD: Sepet oluştur + Alıcı bilgisi ekle + Teslimat adresi ekle + Checkout URL döndür
   * 
   * 2025-10 API'ye göre yeni akış:
   * 1. cartCreate ile sepet + buyerIdentity (email, phone, countryCode)
   * 2. cartDeliveryAddressesAdd ile teslimat adresi (ayrı mutation - yeni yöntem)
   */
  async createCheckoutWithBuyerIdentity(
    shop: string,
    storefrontAccessToken: string,
    lines: CartLineItem[],
    buyerIdentity: BuyerIdentity,
    discountCodes?: string[],
    attributes?: CartAttribute[],
  ): Promise<{
    cartId: string;
    checkoutUrl: string;
    email: string;
  }> {
    this.logger.log('Creating checkout with buyer identity', {
      shop,
      email: buyerIdentity.email,
      linesCount: lines.length,
      hasAddress: !!buyerIdentity.deliveryAddress,
    });

    // Step 1: Create cart with buyer identity (email, phone, countryCode)
    const cart = await this.createCart(
      shop,
      storefrontAccessToken,
      lines,
      {
        email: buyerIdentity.email,
        phone: buyerIdentity.phone,
        countryCode: buyerIdentity.countryCode || 'US',
        customerAccessToken: buyerIdentity.customerAccessToken,
      },
      discountCodes,
      attributes,
    );

    let finalCheckoutUrl = cart.checkoutUrl;

    // Step 2: Add delivery address if provided (NEW 2025-01+ method)
    if (buyerIdentity.deliveryAddress) {
      try {
        const addressResult = await this.addDeliveryAddress(
          shop,
          storefrontAccessToken,
          cart.cartId,
          buyerIdentity.deliveryAddress,
        );
        finalCheckoutUrl = addressResult.checkoutUrl;
        this.logger.log('✅ Delivery address added to cart');
      } catch (addressError) {
        // Log but don't fail - checkout can still work without pre-filled address
        this.logger.warn('Failed to add delivery address, continuing without it', addressError);
      }
    }

    this.logger.log(`✅ Checkout ready with buyer identity`, {
      cartId: cart.cartId,
      email: buyerIdentity.email,
      checkoutUrl: finalCheckoutUrl,
    });

    return {
      cartId: cart.cartId,
      checkoutUrl: finalCheckoutUrl,
      email: buyerIdentity.email,
    };
  }

  /**
   * Variant ID'yi Storefront GID formatına çevir
   */
  formatVariantId(variantId: string | number | bigint): string {
    const id = variantId.toString();
    if (id.startsWith('gid://')) {
      return id;
    }
    return `gid://shopify/ProductVariant/${id}`;
  }
}