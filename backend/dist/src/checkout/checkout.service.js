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
var CheckoutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pricing_calculator_service_1 = require("../pricing/pricing-calculator.service");
const prisma_service_1 = require("../prisma/prisma.service");
const shopify_admin_discount_service_1 = require("../shopify/shopify-admin-discount.service");
const shopify_customer_sync_service_1 = require("../shopify/shopify-customer-sync.service");
const shopify_rest_service_1 = require("../shopify/shopify-rest.service");
const shopify_sso_service_1 = require("../shopify/shopify-sso.service");
const shopify_storefront_service_1 = require("../shopify/shopify-storefront.service");
const discount_engine_service_1 = require("./discount-engine.service");
let CheckoutService = CheckoutService_1 = class CheckoutService {
    config;
    prisma;
    shopifyRest;
    shopifyAdminDiscount;
    shopifyStorefront;
    discountEngine;
    pricingCalculator;
    shopifySso;
    shopifyCustomerSync;
    logger = new common_1.Logger(CheckoutService_1.name);
    storefrontToken;
    constructor(config, prisma, shopifyRest, shopifyAdminDiscount, shopifyStorefront, discountEngine, pricingCalculator, shopifySso, shopifyCustomerSync) {
        this.config = config;
        this.prisma = prisma;
        this.shopifyRest = shopifyRest;
        this.shopifyAdminDiscount = shopifyAdminDiscount;
        this.shopifyStorefront = shopifyStorefront;
        this.discountEngine = discountEngine;
        this.pricingCalculator = pricingCalculator;
        this.shopifySso = shopifySso;
        this.shopifyCustomerSync = shopifyCustomerSync;
        this.storefrontToken = this.config.get('SHOPIFY_STOREFRONT_TOKEN', '');
    }
    async createCheckout(cartId, userId) {
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
        let user = null;
        let shopifyCustomerAccessToken;
        let ssoUrl;
        if (userId) {
            user = await this.prisma.companyUser.findUnique({
                where: { id: userId },
                include: {
                    company: true,
                },
            });
            if (user && user.email) {
                try {
                    if (!user.shopifyCustomerId) {
                        await this.shopifyCustomerSync.syncUserToShopify(userId);
                        user = await this.prisma.companyUser.findUnique({
                            where: { id: userId },
                        });
                    }
                    const settings = merchant.settings || {};
                    const ssoMode = settings.ssoMode || 'alternative';
                    if (ssoMode === 'multipass' && settings.multipassSecret) {
                        ssoUrl = this.shopifySso.generateSsoUrl(merchant.shopDomain, settings.multipassSecret, {
                            email: user.email,
                            firstName: user.firstName || '',
                            lastName: user.lastName || '',
                            customerId: user.shopifyCustomerId?.toString(),
                            returnTo: '/checkout',
                        });
                    }
                    else {
                    }
                }
                catch (ssoErr) {
                    this.logger.warn('SSO setup failed, continuing without SSO', ssoErr);
                }
            }
        }
        const pricing = await this.pricingCalculator.calculateCartPricing(cartId);
        let shopifyTotal = 0;
        for (const item of cart.items) {
            if (item.variant) {
                shopifyTotal += parseFloat(item.variant.price?.toString() || '0') * item.quantity;
            }
        }
        const discountAmount = shopifyTotal - pricing.subtotal;
        let discountCode;
        if (discountAmount > 0) {
            discountCode = await this.discountEngine.generateDiscountCode(merchant.id, cart.companyId, cartId, discountAmount);
            try {
                const shopifyDiscount = await this.shopifyAdminDiscount.createDiscountCode(merchant.shopDomain, merchant.accessToken, discountCode, discountAmount, 'fixed_amount');
                this.logger.log(`Shopify discount created: ${discountCode} (ID: ${shopifyDiscount.discountId})`);
                if (shopifyDiscount.discountId) {
                    await this.prisma.discountCode.updateMany({
                        where: { code: discountCode },
                        data: { shopifyDiscountId: BigInt(0) },
                    });
                }
            }
            catch (error) {
                this.logger.error('Failed to create Shopify discount', error);
            }
        }
        const lines = cart.items.map((item) => ({
            merchandiseId: this.shopifyStorefront.formatVariantId(item.shopifyVariantId),
            quantity: item.quantity,
        }));
        let checkoutUrl;
        const settings = merchant.settings || {};
        const storefrontToken = this.storefrontToken || settings.storefrontToken || '';
        if (storefrontToken && user) {
            try {
                const shippingAddress = await this.getShippingAddress(user);
                const countryCode = shippingAddress?.countryCode ||
                    (shippingAddress?.country === 'United States' ? 'US' :
                        shippingAddress?.country === 'Turkey' ? 'TR' :
                            shippingAddress?.country?.substring(0, 2).toUpperCase()) || 'US';
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
                            country: countryCode,
                            zip: shippingAddress.zip || '',
                            phone: shippingAddress.phone || user.company?.phone || '',
                        }
                        : undefined,
                };
                const attributes = [
                    { key: 'company_id', value: user.companyId || '' },
                    { key: 'company_name', value: user.company?.name || '' },
                    { key: 'order_source', value: 'b2b_portal' },
                    { key: 'user_id', value: user.id },
                    { key: 'user_email', value: user.email },
                ];
                const result = await this.shopifyStorefront.createCheckoutWithBuyerIdentity(merchant.shopDomain, storefrontToken, lines, buyerIdentity, discountCode ? [discountCode] : undefined, attributes);
                checkoutUrl = result.checkoutUrl;
                this.logger.log(`✅ Checkout URL created with buyer identity: ${checkoutUrl}`, {
                    email: user.email,
                });
                if (ssoUrl) {
                    const ssoReturnTo = new URL(ssoUrl).searchParams.get('return_to') || checkoutUrl;
                    checkoutUrl = ssoUrl.replace(/return_to=[^&]*/, `return_to=${encodeURIComponent(checkoutUrl)}`);
                }
            }
            catch (error) {
                this.logger.warn('Storefront API with buyer identity failed, trying basic cart', error);
                try {
                    const result = await this.shopifyStorefront.createCart(merchant.shopDomain, storefrontToken, lines, undefined, discountCode ? [discountCode] : undefined);
                    checkoutUrl = result.checkoutUrl;
                }
                catch (fallbackError) {
                    this.logger.warn('Storefront API failed, using fallback cart URL', fallbackError);
                    checkoutUrl = this.buildCartUrl(merchant.shopDomain, cart.items, discountCode);
                }
            }
        }
        else if (storefrontToken) {
            try {
                const result = await this.shopifyStorefront.createCart(merchant.shopDomain, storefrontToken, lines, shopifyCustomerAccessToken ? { customerAccessToken: shopifyCustomerAccessToken } : undefined, discountCode ? [discountCode] : undefined);
                checkoutUrl = result.checkoutUrl;
                this.logger.log(`Checkout URL created via Storefront API: ${checkoutUrl}`);
            }
            catch (error) {
                this.logger.warn('Storefront API failed, using fallback cart URL', error);
                checkoutUrl = this.buildCartUrl(merchant.shopDomain, cart.items, discountCode);
            }
        }
        else {
            this.logger.log('No storefront token, using cart URL');
            checkoutUrl = this.buildCartUrl(merchant.shopDomain, cart.items, discountCode);
        }
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
            ssoUrl,
            userData: user ? {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
            } : null,
        };
    }
    buildCartUrl(shopDomain, items, discountCode) {
        const cartItems = items.map(i => `${i.shopifyVariantId}:${i.quantity}`).join(',');
        const baseUrl = `https://${shopDomain}/cart/${cartItems}`;
        return discountCode ? `${baseUrl}?discount=${discountCode}` : baseUrl;
    }
    async getShippingAddress(user) {
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
        if (user.company?.shippingAddress) {
            return user.company.shippingAddress;
        }
        if (user.company?.billingAddress) {
            return user.company.billingAddress;
        }
        return null;
    }
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = CheckoutService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        shopify_rest_service_1.ShopifyRestService,
        shopify_admin_discount_service_1.ShopifyAdminDiscountService,
        shopify_storefront_service_1.ShopifyStorefrontService,
        discount_engine_service_1.DiscountEngineService,
        pricing_calculator_service_1.PricingCalculatorService,
        shopify_sso_service_1.ShopifySsoService,
        shopify_customer_sync_service_1.ShopifyCustomerSyncService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map