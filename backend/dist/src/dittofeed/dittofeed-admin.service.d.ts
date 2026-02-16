export declare class DittofeedAdminService {
    private readonly logger;
    private client;
    constructor();
    private initClient;
    private ensureClient;
    setupAllSegments(workspaceId?: string): Promise<{
        created: number;
        errors: string[];
    }>;
    private createSegmentFromTemplate;
    createCustomSegment(name: string, conditions: {
        trait: string;
        operator: string;
        value: any;
    }[], logic?: 'And' | 'Or'): Promise<any>;
    listJourneys(): Promise<any>;
    setJourneyStatus(journeyId: string, status: 'Running' | 'Paused' | 'NotStarted'): Promise<any>;
    listTemplates(): Promise<any>;
    getWorkspaceInfo(): Promise<any>;
    listSegments(): Promise<any>;
    healthCheck(): Promise<{
        connected: boolean;
        error?: string;
    }>;
    getAvailableSegmentTemplates(): {
        key: string;
        name: "Platinum B2B" | "Gold B2B" | "Silver B2B" | "Bronze B2B" | "Gang Sheet Power Users" | "Size-Only Buyers (No Gang Sheet)" | "At-Risk Customers" | "Dormant Accounts" | "UV DTF Specialists" | "Pickup Regulars" | "Supply Buyers (DIY Printers)" | "New Customers (First Order)" | "High-Value At-Risk";
        description: "CLV > $10K, 20+ orders, 3+ years" | "CLV $5-10K, 10-20 orders" | "CLV $1-5K, 5-10 orders" | "CLV < $1K, < 5 orders" | "5+ gang sheet orders per month" | "Buys by-size transfers but never used gang sheets" | "High churn risk — engagement dropping" | "60+ days since last order" | "Primary product type is UV DTF" | "Prefer pickup over shipping" | "Purchases ink, film, powder — runs own DTF printer" | "Just placed their first order" | "Gold/Platinum tier with high churn risk — priority win-back";
        conditionCount: 1 | 2 | 3;
    }[];
    private getJourneyTemplates;
    setupAllJourneys(): Promise<{
        created: number;
        errors: string[];
    }>;
    private createJourneyFromTemplate;
    getAvailableJourneyTemplates(): {
        key: string;
        name: string;
        description: string;
        triggerType: "segment" | "event";
        triggerValue: string;
        stepCount: number;
    }[];
    private getEmailTemplates;
    setupAllEmailTemplates(): Promise<{
        created: number;
        errors: string[];
    }>;
    getAvailableEmailTemplates(): {
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
}
