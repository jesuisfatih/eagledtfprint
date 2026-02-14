import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
interface CartLineItem {
    merchandiseId: string;
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
    deliveryAddress?: DeliveryAddress;
}
interface CartAttribute {
    key: string;
    value: string;
}
export declare class ShopifyStorefrontService {
    private httpService;
    private config;
    private readonly logger;
    private readonly apiVersion;
    constructor(httpService: HttpService, config: ConfigService);
    private buildStorefrontUrl;
    createCart(shop: string, storefrontAccessToken: string, lines: CartLineItem[], buyerIdentity?: {
        email?: string;
        phone?: string;
        countryCode?: string;
        customerAccessToken?: string;
    }, discountCodes?: string[], attributes?: CartAttribute[], note?: string): Promise<{
        cartId: any;
        checkoutUrl: any;
        total: any;
        currency: any;
        discountCodes: any;
    }>;
    addDeliveryAddress(shop: string, storefrontAccessToken: string, cartId: string, address: DeliveryAddress): Promise<{
        cartId: any;
        checkoutUrl: any;
    }>;
    createCustomerAccessToken(shop: string, storefrontAccessToken: string, email: string, password: string): Promise<string | null>;
    createCheckoutWithBuyerIdentity(shop: string, storefrontAccessToken: string, lines: CartLineItem[], buyerIdentity: BuyerIdentity, discountCodes?: string[], attributes?: CartAttribute[]): Promise<{
        cartId: string;
        checkoutUrl: string;
        email: string;
    }>;
    formatVariantId(variantId: string | number | bigint): string;
}
export {};
