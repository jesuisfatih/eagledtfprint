import { HttpService } from '@nestjs/axios';
import { ShopifyService } from './shopify.service';
export declare class ShopifyAdminDiscountService {
    private httpService;
    private shopifyService;
    private readonly logger;
    constructor(httpService: HttpService, shopifyService: ShopifyService);
    createDiscountCode(shop: string, accessToken: string, code: string, value: number, valueType: 'fixed_amount' | 'percentage'): Promise<{
        discountId: any;
        discountCodeId: any;
        code: string;
    }>;
    deleteDiscountCode(shop: string, accessToken: string, discountId: string): Promise<any>;
}
