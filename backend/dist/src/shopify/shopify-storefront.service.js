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
var ShopifyStorefrontService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyStorefrontService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let ShopifyStorefrontService = ShopifyStorefrontService_1 = class ShopifyStorefrontService {
    httpService;
    config;
    logger = new common_1.Logger(ShopifyStorefrontService_1.name);
    apiVersion = '2025-10';
    constructor(httpService, config) {
        this.httpService = httpService;
        this.config = config;
    }
    buildStorefrontUrl(shop) {
        return `https://${shop}/api/${this.apiVersion}/graphql.json`;
    }
    async createCart(shop, storefrontAccessToken, lines, buyerIdentity, discountCodes, attributes, note) {
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
        const input = { lines };
        if (buyerIdentity) {
            input.buyerIdentity = {};
            if (buyerIdentity.customerAccessToken) {
                input.buyerIdentity.customerAccessToken = buyerIdentity.customerAccessToken;
                if (buyerIdentity.email)
                    input.buyerIdentity.email = buyerIdentity.email;
                if (buyerIdentity.phone)
                    input.buyerIdentity.phone = buyerIdentity.phone;
            }
            if (buyerIdentity.countryCode)
                input.buyerIdentity.countryCode = buyerIdentity.countryCode;
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
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, { query: mutation, variables: { input } }, {
                headers: {
                    'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
                    'Content-Type': 'application/json',
                },
            }));
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
                result.warnings.forEach((w) => this.logger.warn(`Cart warning: ${w.code} - ${w.message}`));
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
        }
        catch (error) {
            this.logger.error('Failed to create Shopify cart', error);
            throw error;
        }
    }
    async addDeliveryAddress(shop, storefrontAccessToken, cartId, address) {
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
                        country: address.country,
                        zip: address.zip,
                        phone: address.phone || '',
                    },
                    selected: true,
                },
            ],
        };
        this.logger.log('Adding delivery address to cart', { cartId, city: address.city, country: address.country });
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, { query: mutation, variables }, {
                headers: {
                    'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
                    'Content-Type': 'application/json',
                },
            }));
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
        }
        catch (error) {
            this.logger.error('Failed to add delivery address', error);
            throw error;
        }
    }
    async createCustomerAccessToken(shop, storefrontAccessToken, email, password) {
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
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                query: mutation,
                variables,
            }, {
                headers: {
                    'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
                    'Content-Type': 'application/json',
                },
            }));
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
        }
        catch (error) {
            this.logger.error('Failed to create customer access token', error);
            return null;
        }
    }
    async createCheckoutWithBuyerIdentity(shop, storefrontAccessToken, lines, buyerIdentity, discountCodes, attributes) {
        this.logger.log('Creating checkout with buyer identity', {
            shop,
            email: buyerIdentity.email,
            linesCount: lines.length,
            hasAddress: !!buyerIdentity.deliveryAddress,
        });
        const cart = await this.createCart(shop, storefrontAccessToken, lines, {
            email: buyerIdentity.email,
            phone: buyerIdentity.phone,
            countryCode: buyerIdentity.countryCode || 'US',
            customerAccessToken: buyerIdentity.customerAccessToken,
        }, discountCodes, attributes);
        let finalCheckoutUrl = cart.checkoutUrl;
        if (buyerIdentity.deliveryAddress) {
            try {
                const addressResult = await this.addDeliveryAddress(shop, storefrontAccessToken, cart.cartId, buyerIdentity.deliveryAddress);
                finalCheckoutUrl = addressResult.checkoutUrl;
                this.logger.log('✅ Delivery address added to cart');
            }
            catch (addressError) {
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
    formatVariantId(variantId) {
        const id = variantId.toString();
        if (id.startsWith('gid://')) {
            return id;
        }
        return `gid://shopify/ProductVariant/${id}`;
    }
};
exports.ShopifyStorefrontService = ShopifyStorefrontService;
exports.ShopifyStorefrontService = ShopifyStorefrontService = ShopifyStorefrontService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], ShopifyStorefrontService);
//# sourceMappingURL=shopify-storefront.service.js.map