import { AnalyticsQueryDto, CollectEventDto, GetEventsQueryDto } from './dto/event.dto';
import { EventsService } from './events.service';
export declare class EventsController {
    private eventsService;
    constructor(eventsService: EventsService);
    collectEvent(dto: CollectEventDto): Promise<{
        success: boolean;
    }>;
    getCompanyEvents(companyId: string, query: GetEventsQueryDto): Promise<({
        companyUser: {
            email: string;
            firstName: string | null;
            lastName: string | null;
        } | null;
        product: {
            title: string | null;
            handle: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        merchantId: string;
        shopifyCustomerId: bigint | null;
        shopifyProductId: bigint | null;
        companyId: string | null;
        companyUserId: string | null;
        sessionId: string | null;
        eagleToken: string | null;
        eventType: string;
        productId: string | null;
        variantId: string | null;
        shopifyVariantId: bigint | null;
        payload: import("@prisma/client/runtime/client").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        referrer: string | null;
    })[]>;
    getAnalytics(merchantId: string, query: AnalyticsQueryDto): Promise<{
        totalEvents: number;
        productViews: number;
        addToCarts: number;
        uniqueSessions: number;
        conversionRate: string | number;
        topProducts: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.ActivityLogGroupByOutputType, "shopifyProductId"[]> & {
            _count: {
                id: number;
            };
        })[];
    }>;
    getAdminActivity(merchantId: string, limit?: string): Promise<{
        activities: {
            id: string;
            type: string;
            description: string;
            user: string;
            company: string;
            createdAt: Date;
        }[];
        total: number;
    }>;
    getWebhookActivity(merchantId: string, limit?: string): Promise<{
        logs: {
            id: string;
            topic: string;
            status: string;
            payload: string | null;
            company: string | undefined;
            user: string | null;
            ipAddress: string | null;
            createdAt: Date;
        }[];
        total: number;
    }>;
    getSessionActivity(merchantId: string, limit?: string): Promise<{
        sessions: any[];
        total: number;
    }>;
}
