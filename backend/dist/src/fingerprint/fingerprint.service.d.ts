import { PrismaService } from '../prisma/prisma.service';
import { CollectFingerprintDto } from './dto/collect-fingerprint.dto';
export declare class FingerprintService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    collectFingerprint(dto: CollectFingerprintDto, ipAddress?: string): Promise<{
        success: boolean;
        error: string;
        fingerprintId?: undefined;
        isReturning?: undefined;
        visitCount?: undefined;
        isBot?: undefined;
    } | {
        success: boolean;
        fingerprintId: string;
        isReturning: boolean;
        visitCount: number;
        isBot: boolean;
        error?: undefined;
    }>;
    private resolveIdentity;
    private upsertSession;
    trackEvent(merchantId: string, sessionId: string, fingerprintHash: string, eventType: string, payload: any): Promise<void>;
    updateBehavior(merchantId: string, fingerprintHash: string, eventType: string, payload?: any): Promise<void>;
    private recalculateEngagement;
    updateCompanyIntelligence(merchantId: string, companyId: string): Promise<void>;
    getDashboard(merchantId: string): Promise<{
        stats: {
            totalVisitors: number;
            returningVisitors: number;
            identifiedVisitors: number;
            botCount: number;
            identificationRate: string | number;
        };
        intentDistribution: {
            intent: string;
            count: number;
        }[];
        segmentDistribution: {
            segment: string | null;
            count: number;
        }[];
        recentVisitors: {
            id: string;
            fingerprintHash: string;
            platform: string | null;
            visitCount: number;
            lastSeenAt: Date;
            firstSeenAt: Date;
            isIdentified: boolean;
            identity: {
                email: string | undefined;
                name: string | null;
                company: string | undefined;
                buyerIntent: string;
                engagementScore: number;
            } | null;
        }[];
        topEngaged: {
            id: string;
            email: string | null;
            name: string | null;
            company: string | undefined;
            buyerIntent: string;
            segment: string | null;
            engagementScore: number;
            totalPageViews: number;
            totalProductViews: number;
            totalAddToCarts: number;
            totalOrders: number;
            totalRevenue: number;
            platform: string | null;
            visitCount: number;
            lastSeenAt: Date;
        }[];
    }>;
    getHotLeads(merchantId: string): Promise<{
        leads: {
            id: string;
            email: string | null;
            name: string | null;
            company: string | undefined;
            buyerIntent: string;
            engagementScore: number;
            totalProductViews: number;
            totalAddToCarts: number;
            lastProductViewed: string | null;
            platform: string | null;
            timezone: string | null;
            visitCount: number;
            lastSeenAt: Date;
        }[];
        total: number;
    }>;
    getCompanyIntelligence(merchantId: string, companyId?: string): Promise<({
        company: {
            name: string;
            status: string;
            email: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        companyId: string;
        totalPageViews: number;
        totalProductViews: number;
        totalAddToCarts: number;
        totalOrders: number;
        totalRevenue: import("@prisma/client-runtime-utils").Decimal;
        engagementScore: number;
        buyerIntent: string;
        segment: string;
        totalVisitors: number;
        totalSessions: number;
        avgSessionDuration: number;
        avgOrderValue: import("@prisma/client-runtime-utils").Decimal;
        topViewedProducts: import("@prisma/client/runtime/client").JsonValue | null;
        topPurchasedProducts: import("@prisma/client/runtime/client").JsonValue | null;
        topCategories: import("@prisma/client/runtime/client").JsonValue | null;
        preferredBrands: import("@prisma/client/runtime/client").JsonValue | null;
        lastActiveAt: Date | null;
        firstOrderAt: Date | null;
        lastOrderAt: Date | null;
        daysSinceLastOrder: number | null;
        orderFrequencyDays: number | null;
        suggestedDiscount: number | null;
        suggestedProducts: import("@prisma/client/runtime/client").JsonValue | null;
        churnRisk: number;
        upsellPotential: number;
    }) | ({
        company: {
            name: string;
            status: string;
            email: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        companyId: string;
        totalPageViews: number;
        totalProductViews: number;
        totalAddToCarts: number;
        totalOrders: number;
        totalRevenue: import("@prisma/client-runtime-utils").Decimal;
        engagementScore: number;
        buyerIntent: string;
        segment: string;
        totalVisitors: number;
        totalSessions: number;
        avgSessionDuration: number;
        avgOrderValue: import("@prisma/client-runtime-utils").Decimal;
        topViewedProducts: import("@prisma/client/runtime/client").JsonValue | null;
        topPurchasedProducts: import("@prisma/client/runtime/client").JsonValue | null;
        topCategories: import("@prisma/client/runtime/client").JsonValue | null;
        preferredBrands: import("@prisma/client/runtime/client").JsonValue | null;
        lastActiveAt: Date | null;
        firstOrderAt: Date | null;
        lastOrderAt: Date | null;
        daysSinceLastOrder: number | null;
        orderFrequencyDays: number | null;
        suggestedDiscount: number | null;
        suggestedProducts: import("@prisma/client/runtime/client").JsonValue | null;
        churnRisk: number;
        upsellPotential: number;
    })[] | null>;
    getSessionHistory(merchantId: string, filters: {
        companyId?: string;
        companyUserId?: string;
        fingerprintId?: string;
        limit?: number;
    }): Promise<({
        company: {
            name: string;
        } | null;
        companyUser: {
            email: string;
            firstName: string | null;
            lastName: string | null;
        } | null;
        events: {
            id: string;
            createdAt: Date;
            merchantId: string;
            shopifyProductId: bigint | null;
            companyId: string | null;
            companyUserId: string | null;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            sessionId: string;
            eventType: string;
            shopifyVariantId: bigint | null;
            referrer: string | null;
            fingerprintId: string | null;
            pageUrl: string | null;
            pagePath: string | null;
            pageTitle: string | null;
            productTitle: string | null;
            productPrice: import("@prisma/client-runtime-utils").Decimal | null;
            quantity: number | null;
            searchQuery: string | null;
            cartValue: import("@prisma/client-runtime-utils").Decimal | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        companyId: string | null;
        companyUserId: string | null;
        sessionId: string;
        ipAddress: string | null;
        userAgent: string | null;
        referrer: string | null;
        startedAt: Date;
        platform: string | null;
        language: string | null;
        timezone: string | null;
        isBot: boolean;
        fingerprintId: string;
        landingPage: string | null;
        exitPage: string | null;
        utmSource: string | null;
        utmMedium: string | null;
        utmCampaign: string | null;
        utmContent: string | null;
        utmTerm: string | null;
        gclid: string | null;
        fbclid: string | null;
        ttclid: string | null;
        msclkid: string | null;
        trafficChannel: string | null;
        referrerDomain: string | null;
        pageViews: number;
        productViews: number;
        addToCarts: number;
        searchCount: number;
        durationSeconds: number;
        isLoggedIn: boolean;
        lastActivityAt: Date;
        endedAt: Date | null;
    })[]>;
    private activePresence;
    private mouseData;
    processHeartbeat(merchantId: string, data: {
        sessionId: string;
        fingerprintHash: string;
        eagleToken?: string;
        status: string;
        timestamp: number;
        page: any;
        viewport: any;
    }): Promise<void>;
    processMouseData(merchantId: string, data: {
        sessionId: string;
        fingerprintHash: string;
        viewport: {
            width: number;
            height: number;
        };
        pageUrl: string;
        events: any[];
    }): Promise<void>;
    getActiveVisitors(merchantId: string): Promise<{
        totalOnline: number;
        totalAway: number;
        totalVisitors: number;
        identifiedCount: number;
        activeCompanyCount: number;
        visitors: any[];
    }>;
    getSessionReplay(merchantId: string, sessionId: string): Promise<{
        session: {
            id: string;
            sessionId: string;
            companyName: string | undefined;
            userName: string;
            platform: string | null;
            userAgent: string | null;
            startedAt: Date;
            pageViews: number;
        } | null;
        events: any[];
        totalEvents: number;
        durationMs: number;
    }>;
    processAttribution(merchantId: string, data: any): Promise<void>;
    getTrafficAnalytics(merchantId: string, filters: {
        startDate?: Date;
        endDate?: Date;
        channel?: string;
        utmSource?: string;
        utmCampaign?: string;
    }): Promise<{
        summary: {
            totalSessions: number;
            uniqueVisitors: number;
            avgDuration: number;
            avgPagesPerSession: number;
            totalPageViews: number;
            totalProductViews: number;
            totalAddToCarts: number;
        };
        channelBreakdown: {
            channel: string;
            sessions: number;
            avgDuration: number;
            avgPages: number;
            addToCarts: number;
            productViews: number;
        }[];
        campaignPerformance: {
            campaign: string | null;
            source: string | null;
            medium: string | null;
            channel: string | null;
            sessions: number;
            avgDuration: number;
            avgPages: number;
            addToCarts: number;
            productViews: number;
        }[];
        funnelByChannel: unknown;
        topLandingPages: {
            page: string | null;
            sessions: number;
            avgDuration: number;
            avgPages: number;
            addToCarts: number;
        }[];
        attributionPaths: unknown;
        referrerDomains: {
            domain: string | null;
            sessions: number;
        }[];
        dailyTrend: unknown;
    }>;
    private calculateBotScore;
    private calculateConfidence;
    private determineMatchType;
    private calculateMatchConfidence;
}
