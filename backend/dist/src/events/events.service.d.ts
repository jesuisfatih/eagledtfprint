import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CollectEventDto } from './dto/event.dto';
export declare class EventsService {
    private prisma;
    private eventsQueue;
    private readonly logger;
    constructor(prisma: PrismaService, eventsQueue: Queue);
    collectEvent(dto: CollectEventDto): Promise<{
        success: boolean;
    }>;
    getEventsByCompany(companyId: string, filters?: any): Promise<({
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
    getAnalytics(merchantId: string, dateRange?: {
        from: Date;
        to: Date;
    }): Promise<{
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
    getAdminActivityFeed(merchantId: string, limit?: number): Promise<{
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
    getWebhookActivityFeed(merchantId: string, limit?: number): Promise<{
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
    getSessionActivityFeed(merchantId: string, limit?: number): Promise<{
        sessions: any[];
        total: number;
    }>;
}
