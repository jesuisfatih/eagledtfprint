import { HttpService } from '@nestjs/axios';
import { ShopifyService } from './shopify.service';
export declare class ShopifyAdminDiscountService {
    private httpService;
    private shopifyService;
    private readonly logger;
    constructor(httpService: HttpService, shopifyService: ShopifyService);
    fetchAllDiscountCodes(shop: string, accessToken: string): Promise<any[]>;
    fetchAutoDiscounts(shop: string, accessToken: string): Promise<any>;
    createDiscountCode(shop: string, accessToken: string, code: string, value: number, valueType: 'fixed_amount' | 'percentage', options?: {
        title?: string;
        endsAt?: string;
        usageLimit?: number;
        appliesOncePerCustomer?: boolean;
        minimumAmount?: number;
        customerIds?: string[];
    }): Promise<{
        discountId: any;
        discountCodeId: any;
        code: string;
        status: any;
    }>;
    createCustomerDiscount(shop: string, accessToken: string, params: {
        code: string;
        title: string;
        percentage: number;
        customerGid: string;
        expiresInHours?: number;
        minimumAmount?: number;
    }): Promise<{
        discountId: any;
        discountCodeId: any;
        code: string;
        status: any;
    }>;
    deleteDiscountCode(shop: string, accessToken: string, discountId: string): Promise<any>;
    getDiscountAnalytics(shop: string, accessToken: string, discountId: string): Promise<any>;
}
