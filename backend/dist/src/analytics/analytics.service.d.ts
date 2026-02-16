import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(merchantId: string): Promise<{
        totalCompanies: number;
        totalUsers: number;
        totalOrders: number;
        totalEvents: number;
        totalRevenue: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    getConversionFunnel(merchantId: string): Promise<{
        steps: {
            name: string;
            count: number;
        }[];
        conversionRate: string | number;
    }>;
    getTopProducts(merchantId: string, limit?: number): Promise<(import("@prisma/client/client").Prisma.PickEnumerable<import("@prisma/client/client").Prisma.ActivityLogGroupByOutputType, "shopifyProductId"[]> & {
        _count: {
            id: number;
        };
    })[]>;
    getTopCompanies(merchantId: string, limit?: number): Promise<{
        id: string;
        name: string;
        orderCount: number;
        totalSpent: number;
    }[]>;
    getOrderProfitability(orderId: string): Promise<{
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
