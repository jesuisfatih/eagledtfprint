import { DittofeedService } from '../../dittofeed/dittofeed.service';
import { PickupService } from '../../pickup/pickup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyService } from '../../shopify/shopify.service';
import { ShopifyWebhookSyncService } from '../shopify-webhook-sync.service';
export declare class OrdersHandler {
    private prisma;
    private webhookSync;
    private shopifyService;
    private pickupService;
    private dittofeedService;
    private readonly logger;
    constructor(prisma: PrismaService, webhookSync: ShopifyWebhookSyncService, shopifyService: ShopifyService, pickupService: PickupService, dittofeedService: DittofeedService);
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
    handleOrderUpdated(orderData: any, headers: any): Promise<{
        success: boolean;
    }>;
}
