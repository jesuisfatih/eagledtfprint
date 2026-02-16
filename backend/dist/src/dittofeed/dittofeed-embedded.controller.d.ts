import { DittofeedAdminService } from './dittofeed-admin.service';
import { DittofeedDbReaderService } from './dittofeed-db-reader.service';
import { DittofeedService } from './dittofeed.service';
export declare class DittofeedEmbeddedController {
    private readonly admin;
    private readonly dbReader;
    private readonly dittofeed;
    constructor(admin: DittofeedAdminService, dbReader: DittofeedDbReaderService, dittofeed: DittofeedService);
    listSegments(): Promise<any[]>;
    getSegmentTemplates(): {
        key: string;
        name: "Platinum B2B" | "Gold B2B" | "Silver B2B" | "Bronze B2B" | "Gang Sheet Power Users" | "Size-Only Buyers (No Gang Sheet)" | "At-Risk Customers" | "Dormant Accounts" | "UV DTF Specialists" | "Pickup Regulars" | "Supply Buyers (DIY Printers)" | "New Customers (First Order)" | "High-Value At-Risk";
        description: "CLV > $10K, 20+ orders, 3+ years" | "CLV $5-10K, 10-20 orders" | "CLV $1-5K, 5-10 orders" | "CLV < $1K, < 5 orders" | "5+ gang sheet orders per month" | "Buys by-size transfers but never used gang sheets" | "High churn risk — engagement dropping" | "60+ days since last order" | "Primary product type is UV DTF" | "Prefer pickup over shipping" | "Purchases ink, film, powder — runs own DTF printer" | "Just placed their first order" | "Gold/Platinum tier with high churn risk — priority win-back";
        conditionCount: 1 | 2 | 3;
    }[];
    setupAllSegments(): Promise<{
        created: number;
        errors: string[];
    }>;
    createCustomSegment(body: {
        name: string;
        conditions: Array<{
            trait: string;
            operator: string;
            value: any;
        }>;
        logic?: 'And' | 'Or';
    }): Promise<any>;
    listJourneys(): Promise<any[]>;
    getJourneyTemplates(): {
        key: string;
        name: string;
        description: string;
        triggerType: "segment" | "event";
        triggerValue: string;
        stepCount: number;
    }[];
    setupAllJourneys(): Promise<{
        created: number;
        errors: string[];
    }>;
    setJourneyStatus(journeyId: string, status: 'Running' | 'Paused' | 'NotStarted'): Promise<any>;
    listTemplates(): Promise<any[]>;
    getAvailableTemplates(): {
        key: string;
        name: string;
        subject: string;
    }[];
    setupAllTemplates(): Promise<{
        created: number;
        errors: string[];
    }>;
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
    getAnalyticsOverview(days?: string): Promise<{
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
    getCampaignStats(days?: string): Promise<import("./dittofeed-db-reader.service").CampaignMetrics>;
    getJourneyAnalytics(): Promise<import("./dittofeed-db-reader.service").JourneyMetrics[]>;
    getMessageStats(days?: string): Promise<import("./dittofeed-db-reader.service").MessagePerformance[]>;
    getDailyTrends(days?: string): Promise<{
        date: string;
        sent: number;
        opened: number;
        clicked: number;
    }[]>;
    getWidgetConfig(): {
        version: string;
        widgets: ({
            id: string;
            name: string;
            description: string;
            endpoint: string;
            type: string;
            features: string[];
            availableTraits: string[];
            availableOperators: string[];
            chartTypes?: undefined;
        } | {
            id: string;
            name: string;
            description: string;
            endpoint: string;
            type: string;
            features: string[];
            availableTraits?: undefined;
            availableOperators?: undefined;
            chartTypes?: undefined;
        } | {
            id: string;
            name: string;
            description: string;
            endpoint: string;
            type: string;
            features: string[];
            chartTypes: string[];
            availableTraits?: undefined;
            availableOperators?: undefined;
        })[];
        quickActions: {
            label: string;
            description: string;
            endpoint: string;
            method: string;
            confirmRequired: boolean;
        }[];
    };
    getEmbedUrls(): {
        note: string;
        dashboardUrl: string;
        segments: string;
        journeys: string;
        templates: string;
        broadcasts: string;
        settings: string;
        apiAlternative: {
            message: string;
            widgetConfig: string;
        };
    };
    getHealth(): Promise<{
        adminApi: {
            connected: boolean;
            error?: string;
        };
        database: {
            connected: boolean;
            error?: string;
        };
        overall: any;
    }>;
}
