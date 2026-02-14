import { HttpService } from '@nestjs/axios';
import { ShopifyService } from './shopify.service';
export declare class ShopifyRestService {
    private httpService;
    private shopifyService;
    private readonly logger;
    constructor(httpService: HttpService, shopifyService: ShopifyService);
    get<T>(shop: string, accessToken: string, path: string): Promise<T>;
    post<T>(shop: string, accessToken: string, path: string, data: any): Promise<T>;
    put<T>(shop: string, accessToken: string, path: string, data: any): Promise<T>;
    delete<T>(shop: string, accessToken: string, path: string): Promise<T>;
    getCustomers(shop: string, accessToken: string, limit?: number): Promise<unknown>;
    createCustomerInvite(shop: string, accessToken: string, customerId: string): Promise<{
        customer_invite: {
            to: string;
            from: string;
            subject: string;
            custom_message: string;
            invite_url: string;
        };
    }>;
    updateCustomerSubscription(shop: string, accessToken: string, customerId: string, acceptsMarketing: boolean): Promise<any>;
    updateCustomerMetafields(shop: string, accessToken: string, customerId: string, metafields: Array<{
        namespace: string;
        key: string;
        value: string;
        type: string;
    }>): Promise<any>;
    getCustomerMetafields(shop: string, accessToken: string, customerId: string): Promise<any[]>;
    getProducts(shop: string, accessToken: string, limit?: number): Promise<unknown>;
    getOrders(shop: string, accessToken: string, limit?: number): Promise<unknown>;
}
