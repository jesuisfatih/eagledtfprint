import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyService } from '../../shopify/shopify.service';
export declare class CustomersHandler {
    private prisma;
    private shopifyService;
    private readonly logger;
    constructor(prisma: PrismaService, shopifyService: ShopifyService);
    handleCustomerCreate(customerData: any, headers: any): Promise<{
        success: boolean;
    }>;
}
