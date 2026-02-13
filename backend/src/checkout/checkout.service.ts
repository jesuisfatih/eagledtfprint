import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PricingCalculatorService } from '../pricing/pricing-calculator.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyAdminDiscountService } from '../shopify/shopify-admin-discount.service';
import { ShopifyCustomerSyncService } from '../shopify/shopify-customer-sync.service';
import { ShopifyRestService } from '../shopify/shopify-rest.service';
import { ShopifySsoService } from '../shopify/shopify-sso.service';
import { ShopifyStorefrontService } from '../shopify/shopify-storefront.service';
import { DiscountEngineService } from './discount-engine.service';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private readonly storefrontToken: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private shopifyRest: ShopifyRestService,
    private shopifyAdminDiscount: ShopifyAdminDiscountService,
    private shopifyStorefront: ShopifyStorefrontService,
    private discountEngine: DiscountEngineService,
    private pricingCalculator: PricingCalculatorService,
    private shopifySso: ShopifySsoService,
    private shopifyCustomerSync: ShopifyCustomerSyncService,
  ) {
    this.storefrontToken = this.config.get<string>('SHOPIFY_STOREFRONT_TOKEN', '');
  }

  async createCheckout(cartId: string, userId?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
        company: {
          include: {
            users: userId ? {
              where: { id: userId },
            } : false,
          },
        },
      },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: cart.merchantId },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Get user data for SSO and autofill
    let user: any = null;
    let shopifyCustomerAccessToken: string | undefined;
    let ssoUrl: string | undefined;

    if (userId) {
      user = await this.prisma.companyUser.findUnique({
        where: { id: userId },
        include: {
          company: true,
        },
      });

      if (user && user.email) {
        // Ensure user is synced to Shopify
        try {
          if (!user.shopifyCustomerId) {
            await this.shopifyCustomerSync.syncUserToShopify(userId);
            // Reload user to get Shopify ID
            user = await this.prisma.companyUser.findUnique({
              where: { id: userId },
            });
          }

          // Get SSO mode from merchant settings
          const settings = (merchant.settings as any) || {};
          const ssoMode = settings.ssoMode || 'alternative';

          if (ssoMode === 'multipass' && settings.multipassSecret) {
            // Generate Multipass SSO URL with merchant-specific credentials
            ssoUrl = this.shopifySso.generateSsoUrl(
              merchant.shopDomain,
              settings.multipassSecret,
              {
                email: user.email,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                customerId: user.shopifyCustomerId?.toString(),
                returnTo: '/checkout', // Will be updated with actual checkout URL
              },
            );
          } else {
            // Alternative SSO: Use Storefront API customerAccessToken
            // First, we need to get/create customer access token
            // This requires Storefront API customerAccessTokenCreate mutation
            // For now, we'll use cookie-based approach via snippet
          }
        } catch (ssoErr) {
          this.logger.warn('SSO setup failed, continuing without SSO', ssoErr);
        }
      }
    }

    // Recalculate cart pricing
    const pricing = await this.pricingCalculator.calculateCartPricing(cartId);

    // Calculate Shopify standard total
    let shopifyTotal = 0;
    for (const item of cart.items) {
      if (item.variant) {
        shopifyTotal += parseFloat(item.variant.price?.toString() || '0') * item.quantity;
      }
    }

    const discountAmount = shopifyTotal - pricing.subtotal;

    // Generate discount code if needed
    let discountCode: string | undefined;
    if (discountAmount > 0) {
      discountCode = await this.discountEngine.generateDiscountCode(
        merchant.id,
        cart.companyId,
        cartId,
        discountAmount,
      );

      // Create discount in Shopify Admin API (SYNC)
      try {
        const shopifyDiscount = await this.shopifyAdminDiscount.createDiscountCode(
          merchant.shopDomain,
          merchant.accessToken,
          discountCode,
          discountAmount,
          'fixed_amount',
        );

        this.logger.log(`Shopify discount created: ${discountCode} (ID: ${shopifyDiscount.discountId})`);

        // Update discount code with Shopify ID (store as string since it's GraphQL ID format)
        if (shopifyDiscount.discountId) {
          await this.prisma.discountCode.updateMany({
            where: { code: discountCode },
            data: { shopifyDiscountId: BigInt(0) }, // GraphQL IDs are strings, store placeholder
          });
        }
      } catch (error) {
        this.logger.error('Failed to create Shopify discount', error);
        // Continue anyway - discount will be in URL
      }
    }

    // Create Shopify cart via Storefront API
    const lines = cart.items.map((item) => ({
      merchandiseId: this.shopifyStorefront.formatVariantId(item.shopifyVariantId!),
      quantity: item.quantity,
    }));

    let checkoutUrl: string;

    // Get storefront token - prefer .env, fallback to merchant settings
    const settings = (merchant.settings as any) || {};
    const storefrontToken = this.storefrontToken || settings.storefrontToken || '';

    // Try Storefront API with buyer identity if token exists
    if (storefrontToken && user) {
      try {
        // Get shipping address for buyer identity
        const shippingAddress = await this.getShippingAddress(user);

        // Create checkout with buyer identity (email & address pre-filled)
        // Use address country code or derive from country name or default to US
        const countryCode = shippingAddress?.countryCode ||
          (shippingAddress?.country === 'United States' ? 'US' :
           shippingAddress?.country === 'Turkey' ? 'TR' :
           shippingAddress?.country?.substring(0, 2).toUpperCase()) || 'US';

        // NEW 2025-10 API format: deliveryAddress instead of deliveryAddressPreferences
        const buyerIdentity = {
          email: user.email,
          phone: shippingAddress?.phone || user.company?.phone || undefined,
          countryCode,
          deliveryAddress: shippingAddress
            ? {
                firstName: shippingAddress.firstName || user.firstName || '',
                lastName: shippingAddress.lastName || user.lastName || '',
                company: user.company?.name || '',
                address1: shippingAddress.address1 || '',
                address2: shippingAddress.address2 || '',
                city: shippingAddress.city || '',
                province: shippingAddress.province || shippingAddress.provinceCode || '',
                country: countryCode, // Use ISO code for API
                zip: shippingAddress.zip || '',
                phone: shippingAddress.phone || user.company?.phone || '',
              }
            : undefined,
        };

        // B2B attributes to track order source
        const attributes = [
          { key: 'company_id', value: user.companyId || '' },
          { key: 'company_name', value: user.company?.name || '' },
          { key: 'order_source', value: 'b2b_portal' },
          { key: 'user_id', value: user.id },
          { key: 'user_email', value: user.email },
        ];

        const result = await this.shopifyStorefront.createCheckoutWithBuyerIdentity(
          merchant.shopDomain,
          storefrontToken,
          lines,
          buyerIdentity,
          discountCode ? [discountCode] : undefined,
          attributes,
        );

        checkoutUrl = result.checkoutUrl;
        this.logger.log(`✅ Checkout URL created with buyer identity: ${checkoutUrl}`, {
          email: user.email,
        });

        // If SSO URL exists, append it to checkout URL
        if (ssoUrl) {
          // Extract return_to and update checkout URL
          const ssoReturnTo = new URL(ssoUrl).searchParams.get('return_to') || checkoutUrl;
          checkoutUrl = ssoUrl.replace(/return_to=[^&]*/, `return_to=${encodeURIComponent(checkoutUrl)}`);
        }
      } catch (error) {
        this.logger.warn('Storefront API with buyer identity failed, trying basic cart', error);
        // Fallback to basic cart
        try {
          const result = await this.shopifyStorefront.createCart(
            merchant.shopDomain,
            storefrontToken,
            lines,
            undefined, // buyerIdentity
            discountCode ? [discountCode] : undefined,
          );
          checkoutUrl = result.checkoutUrl;
        } catch (fallbackError) {
          this.logger.warn('Storefront API failed, using fallback cart URL', fallbackError);
          checkoutUrl = this.buildCartUrl(merchant.shopDomain, cart.items, discountCode);
        }
      }
    } else if (storefrontToken) {
      // Have token but no user - use basic cart
      try {
        const result = await this.shopifyStorefront.createCart(
          merchant.shopDomain,
          storefrontToken,
          lines,
          shopifyCustomerAccessToken ? { customerAccessToken: shopifyCustomerAccessToken } : undefined, // buyerIdentity
          discountCode ? [discountCode] : undefined,
        );

        checkoutUrl = result.checkoutUrl;
        this.logger.log(`Checkout URL created via Storefront API: ${checkoutUrl}`);
      } catch (error) {
        this.logger.warn('Storefront API failed, using fallback cart URL', error);
        checkoutUrl = this.buildCartUrl(merchant.shopDomain, cart.items, discountCode);
      }
    } else {
      // No storefront token - use cart URL directly
      this.logger.log('No storefront token, using cart URL');
      checkoutUrl = this.buildCartUrl(merchant.shopDomain, cart.items, discountCode);
    }

    // Update cart
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        shopifyCheckoutUrl: checkoutUrl,
        status: 'approved',
      },
    });

    return {
      checkoutUrl,
      discountCode,
      total: pricing.subtotal,
      savings: discountAmount,
      ssoUrl, // Return SSO URL if available
      userData: user ? {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      } : null,
    };
  }

  private buildCartUrl(shopDomain: string, items: any[], discountCode?: string): string {
    const cartItems = items.map(i => `${i.shopifyVariantId}:${i.quantity}`).join(',');
    const baseUrl = `https://${shopDomain}/cart/${cartItems}`;
    return discountCode ? `${baseUrl}?discount=${discountCode}` : baseUrl;
  }

  /**
   * Get shipping address for buyer identity
   */
  private async getShippingAddress(user: any): Promise<any | null> {
    // First try to get default shipping address from Address table
    const address = await this.prisma.address.findFirst({
      where: {
        companyId: user.companyId,
        isShipping: true,
        isDefault: true,
      },
    });

    if (address) {
      return address;
    }

    // Fallback to company's shipping address
    if (user.company?.shippingAddress) {
      return user.company.shippingAddress;
    }

    // Fallback to company's billing address
    if (user.company?.billingAddress) {
      return user.company.billingAddress;
    }

    return null;
  }
}
