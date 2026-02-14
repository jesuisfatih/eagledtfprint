import { HttpService } from '@nestjs/axios';
import { ShopifyService } from './shopify.service';
export declare class ShopifyGraphqlService {
    private httpService;
    private shopifyService;
    private readonly logger;
    constructor(httpService: HttpService, shopifyService: ShopifyService);
    query<T>(shop: string, accessToken: string, query: string, variables?: any): Promise<T>;
    getProductsWithVariants(shop: string, accessToken: string, first?: number, cursor?: string): Promise<unknown>;
    getCustomers(shop: string, accessToken: string, first?: number, cursor?: string): Promise<unknown>;
}
