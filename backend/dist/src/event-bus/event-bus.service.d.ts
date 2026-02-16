import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class EventBusService {
    private prisma;
    private dittofeed;
    private readonly logger;
    constructor(prisma: PrismaService, dittofeed: DittofeedService);
    companyApproved(data: {
        merchantId: string;
        companyId: string;
        companyName: string;
        users: Array<{
            id: string;
            email: string;
            firstName?: string;
            lastName?: string;
            role?: string;
        }>;
    }): Promise<void>;
    orderCreated(data: {
        merchantId: string;
        orderId: string;
        orderNumber: string;
        companyId?: string;
        companyUserId?: string;
        totalPrice: number;
        lineItemCount: number;
        hasDesignFiles: boolean;
        designFileCount: number;
        isPickup: boolean;
    }): Promise<void>;
    cartAbandoned(data: {
        merchantId: string;
        cartId: string;
        companyUserId?: string;
        companyId?: string;
        total: number;
        itemCount: number;
        abandonedMinutes: number;
    }): Promise<void>;
    designUploaded(data: {
        merchantId: string;
        orderId: string;
        orderNumber: string;
        companyUserId?: string;
        companyId?: string;
        fileCount: number;
        dimensions: Array<{
            width: number;
            height: number;
            unit: string;
        }>;
    }): Promise<void>;
    designAbandoned(data: {
        merchantId: string;
        designProjectId: string;
        orderId?: string;
        companyUserId?: string;
        companyId?: string;
        hoursInactive: number;
    }): Promise<void>;
    printReady(data: {
        merchantId: string;
        pickupOrderId: string;
        orderId: string;
        orderNumber: string;
        companyUserId?: string;
        companyId?: string;
        shelfCode?: string;
        qrCode?: string;
    }): Promise<void>;
    churnRiskDetected(data: {
        merchantId: string;
        companyId: string;
        companyUserId?: string;
        companyName: string;
        healthScore: number;
        churnRisk: string;
        daysSinceLastOrder: number;
    }): Promise<void>;
    emit(data: {
        merchantId: string;
        eventType: string;
        companyId?: string;
        companyUserId?: string;
        payload?: Record<string, any>;
        dittofeedEventName?: string;
    }): Promise<void>;
}
