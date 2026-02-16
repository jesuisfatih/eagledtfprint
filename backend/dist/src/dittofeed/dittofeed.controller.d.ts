import { PrismaService } from '../prisma/prisma.service';
import { CrossSellService } from './cross-sell.service';
import { DittofeedAdminService } from './dittofeed-admin.service';
import { DittofeedDbReaderService } from './dittofeed-db-reader.service';
import { DittofeedService } from './dittofeed.service';
export declare class DittofeedController {
    private readonly dittofeedService;
    private readonly prisma;
    private readonly adminService;
    private readonly crossSellService;
    private readonly dbReader;
    constructor(dittofeedService: DittofeedService, prisma: PrismaService, adminService: DittofeedAdminService, crossSellService: CrossSellService, dbReader: DittofeedDbReaderService);
    syncCompanies(merchantId: string): Promise<{
        synced: number;
        success: boolean;
    }>;
    syncIntelligence(merchantId: string): Promise<{
        synced: number;
        success: boolean;
    }>;
    syncOrders(merchantId: string, hours?: string): Promise<{
        synced: number;
        success: boolean;
    }>;
    syncEvents(merchantId: string, hours?: string): Promise<{
        synced: number;
        success: boolean;
    }>;
    syncInsights(merchantId: string): Promise<{
        synced: number;
        success: boolean;
    }>;
    syncDtfTraits(merchantId: string): Promise<{
        synced: number;
        success: boolean;
    }>;
    syncPickupTraits(merchantId: string): Promise<{
        synced: number;
        success: boolean;
    }>;
    syncAll(merchantId: string): Promise<{
        success: boolean;
        companies: number;
        intelligence: number;
        orders: number;
        events: number;
        insights: number;
        dtfTraits: number;
        pickupTraits: number;
    }>;
    webhookCallback(body: {
        type: string;
        userId: string;
        journeyName?: string;
        data?: Record<string, any>;
    }): Promise<{
        received: boolean;
    }>;
    getDashboardUrl(): {
        url: string;
    };
    getSyncStatus(merchantId: string): Promise<{
        success: boolean;
        lastSyncAt: string | null;
        counts: Record<string, number>;
    }>;
    setupSegments(): Promise<{
        created: number;
        errors: string[];
    }>;
    listSegments(): Promise<any>;
    getSegmentTemplates(): {
        key: string;
        name: "Platinum B2B" | "Gold B2B" | "Silver B2B" | "Bronze B2B" | "Gang Sheet Power Users" | "Size-Only Buyers (No Gang Sheet)" | "At-Risk Customers" | "Dormant Accounts" | "UV DTF Specialists" | "Pickup Regulars" | "Supply Buyers (DIY Printers)" | "New Customers (First Order)" | "High-Value At-Risk";
        description: "CLV > $10K, 20+ orders, 3+ years" | "CLV $5-10K, 10-20 orders" | "CLV $1-5K, 5-10 orders" | "CLV < $1K, < 5 orders" | "5+ gang sheet orders per month" | "Buys by-size transfers but never used gang sheets" | "High churn risk — engagement dropping" | "60+ days since last order" | "Primary product type is UV DTF" | "Prefer pickup over shipping" | "Purchases ink, film, powder — runs own DTF printer" | "Just placed their first order" | "Gold/Platinum tier with high churn risk — priority win-back";
        conditionCount: 1 | 2 | 3;
    }[];
    createCustomSegment(body: {
        name: string;
        conditions: {
            trait: string;
            operator: string;
            value: any;
        }[];
        logic?: 'And' | 'Or';
    }): Promise<any>;
    listJourneys(): Promise<any>;
    adminHealth(): Promise<{
        connected: boolean;
        error?: string;
    }>;
    analyzeCrossSell(merchantId: string): Promise<{
        eventsSent: number;
    }>;
    checkSupplyReorders(merchantId: string): Promise<{
        alertsSent: number;
    }>;
    getRecommendations(userId: string): Promise<{
        type: string;
        title: string;
        reason: string;
        discount?: string;
    }[]>;
    setupJourneys(): Promise<{
        created: number;
        errors: string[];
    }>;
    getJourneyTemplates(): {
        key: string;
        name: string;
        description: string;
        triggerType: "segment" | "event";
        triggerValue: string;
        stepCount: number;
    }[];
    setupTemplates(): Promise<{
        created: number;
        errors: string[];
    }>;
    getEmailTemplates(): {
        key: string;
        name: string;
        subject: string;
    }[];
    setupFullStore(): Promise<{
        segments: {
            created: number;
            errors: string[];
        };
        journeys: {
            created: number;
            errors: string[];
        };
        templates: {
            created: number;
            errors: string[];
        };
    }>;
    getFullAnalytics(days?: string): Promise<{
        campaign: import("./dittofeed-db-reader.service").CampaignMetrics;
        journeys: import("./dittofeed-db-reader.service").JourneyMetrics[];
        messages: import("./dittofeed-db-reader.service").MessagePerformance[];
        segments: {
            segmentName: string;
            count: number;
        }[];
        trends: {
            date: string;
            sent: number;
            opened: number;
            clicked: number;
        }[];
        period: string;
        fetchedAt: string;
    }>;
    getCampaignMetrics(days?: string): Promise<import("./dittofeed-db-reader.service").CampaignMetrics>;
    getJourneyMetrics(): Promise<import("./dittofeed-db-reader.service").JourneyMetrics[]>;
    getMessagePerformance(days?: string): Promise<import("./dittofeed-db-reader.service").MessagePerformance[]>;
    getSegmentCounts(): Promise<{
        segmentName: string;
        count: number;
    }[]>;
    getDailyTrends(days?: string): Promise<{
        date: string;
        sent: number;
        opened: number;
        clicked: number;
    }[]>;
    dbHealth(): Promise<{
        connected: boolean;
        error?: string;
    }>;
    private getLastSyncTime;
    private getTraitSyncCounts;
}
