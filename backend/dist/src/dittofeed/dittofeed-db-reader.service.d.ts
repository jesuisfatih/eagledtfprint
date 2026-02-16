export interface CampaignMetrics {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribed: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
}
export interface JourneyMetrics {
    journeyName: string;
    totalEntered: number;
    totalCompleted: number;
    totalActive: number;
    completionRate: number;
    avgCompletionTimeHours: number;
}
export interface MessagePerformance {
    templateName: string;
    channel: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
}
export declare class DittofeedDbReaderService {
    private readonly logger;
    private pool;
    constructor();
    private initPool;
    private query;
    getCampaignMetrics(days?: number): Promise<CampaignMetrics>;
    getJourneyMetrics(): Promise<JourneyMetrics[]>;
    getMessagePerformance(days?: number): Promise<MessagePerformance[]>;
    getSegmentCounts(): Promise<{
        segmentName: string;
        count: number;
    }[]>;
    getDailyTrends(days?: number): Promise<{
        date: string;
        sent: number;
        opened: number;
        clicked: number;
    }[]>;
    getFullAnalytics(days?: number): Promise<{
        campaign: CampaignMetrics;
        journeys: JourneyMetrics[];
        messages: MessagePerformance[];
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
    healthCheck(): Promise<{
        connected: boolean;
        error?: string;
    }>;
    onModuleDestroy(): Promise<void>;
}
