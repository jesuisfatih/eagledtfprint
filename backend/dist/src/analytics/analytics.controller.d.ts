import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboard(merchantId: string): Promise<{
        totalCompanies: number;
        totalUsers: number;
        totalOrders: number;
        totalEvents: number;
        totalRevenue: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    getFunnel(merchantId: string): Promise<{
        steps: {
            name: string;
            count: number;
        }[];
        conversionRate: string | number;
    }>;
    getTopProducts(merchantId: string, limit?: string): Promise<(import("@prisma/client/client").Prisma.PickEnumerable<import("@prisma/client/client").Prisma.ActivityLogGroupByOutputType, "shopifyProductId"[]> & {
        _count: {
            id: number;
        };
    })[]>;
    getTopCompanies(merchantId: string, limit?: string): Promise<{
        id: string;
        name: string;
        orderCount: number;
        totalSpent: number;
    }[]>;
    getProfitability(orderId: string): Promise<{
        orderNumber: string | null;
        revenue: number;
        costs: {
            shipping: number;
            material: number;
            labor: number;
        };
        netProfit: number;
        margin: number;
    } | null>;
    getOperatorLeaderboard(merchantId: string): Promise<any[]>;
}
