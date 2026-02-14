import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyWebhookSyncService } from '../shopify-webhook-sync.service';
import { ShopifyService } from '../../shopify/shopify.service';
export declare class OrdersHandler {
    private prisma;
    private webhookSync;
    private shopifyService;
    private readonly logger;
    constructor(prisma: PrismaService, webhookSync: ShopifyWebhookSyncService, shopifyService: ShopifyService);
    handleOrderCreate(orderData: any, headers: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    handleOrderPaid(orderData: any, headers: any): Promise<{
        success: boolean;
    }>;
}
