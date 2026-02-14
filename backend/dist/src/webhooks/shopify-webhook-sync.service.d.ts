import { PrismaService } from '../prisma/prisma.service';
import { ShopifyCustomerSyncService } from '../shopify/shopify-customer-sync.service';
import { ShopifyService } from '../shopify/shopify.service';
export declare class ShopifyWebhookSyncService {
    private prisma;
    private shopifyCustomerSync;
    private shopifyService;
    private readonly logger;
    constructor(prisma: PrismaService, shopifyCustomerSync: ShopifyCustomerSyncService, shopifyService: ShopifyService);
    handleOrderCreate(orderData: any, shop: string): Promise<void>;
}
