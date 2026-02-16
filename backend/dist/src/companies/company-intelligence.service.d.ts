import { PrismaService } from '../prisma/prisma.service';
export declare class CompanyIntelligenceService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    calculateAll(merchantId: string): Promise<{
        processed: number;
        total: number;
    }>;
    calculateForCompany(merchantId: string, company: any): Promise<{
        companyId: any;
        engagementScore: number;
        segment: string;
        buyerIntent: string;
    }>;
    getDashboard(merchantId: string): Promise<{
        summary: {
            totalCompanies: number;
            activeCompanies: number;
            totalRevenue: number;
            totalOrders: number;
            avgRevenuePerCompany: number;
            avgOrdersPerCompany: number;
        };
        segmentDistribution: Record<string, number>;
        intentDistribution: Record<string, number>;
        topByRevenue: {
            id: string;
            name: string;
            revenue: number;
            orders: number;
            engagementScore: number;
            segment: string;
            buyerIntent: string;
            churnRisk: number;
            lastOrderAt: Date | null;
        }[];
        atRisk: {
            id: string;
            name: string;
            churnRisk: number;
            daysSinceLastOrder: number | null;
            totalRevenue: number;
            segment: string;
        }[];
        growthCompanies: {
            id: string;
            name: string;
            engagementScore: number;
            buyerIntent: string;
            totalProductViews: number;
            totalAddToCarts: number;
            upsellPotential: number;
        }[];
        allCompanies: {
            id: string;
            name: string;
            email: string | null;
            status: string;
            engagementScore: number;
            buyerIntent: string;
            segment: string;
            totalOrders: number;
            totalRevenue: number;
            avgOrderValue: number;
            churnRisk: number;
            upsellPotential: number;
            daysSinceLastOrder: number | null;
            lastActiveAt: Date | null;
            lastOrderAt: Date | null;
        }[];
    }>;
    getCompanyDetail(merchantId: string, companyId: string): Promise<{
        intelligence: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            merchantId: string;
            lastOrderAt: Date | null;
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
            daysSinceLastOrder: number | null;
            orderFrequencyDays: number | null;
            suggestedDiscount: number | null;
            suggestedProducts: import("@prisma/client/runtime/client").JsonValue | null;
            churnRisk: number;
            upsellPotential: number;
        } | null;
        recentOrders: {
            id: string;
            orderNumber: string | null;
            totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
            financialStatus: string | null;
            fulfillmentStatus: string | null;
            createdAt: Date;
        }[];
        recentSessions: {
            id: string;
            pageViews: number;
            productViews: number;
            duration: number;
            landingPage: string | null;
            startedAt: Date;
        }[];
        monthlyRevenue: {
            month: string;
            revenue: number;
            orders: number;
        }[];
        userActivity: (import("@prisma/client/client").Prisma.PickEnumerable<import("@prisma/client/client").Prisma.VisitorSessionGroupByOutputType, "companyUserId"[]> & {
            _count: number;
            _sum: {
                pageViews: number | null;
                productViews: number | null;
                addToCarts: number | null;
                durationSeconds: number | null;
            };
        })[];
        cartActivity: {
            total: number;
            draft: number;
            submitted: number;
            converted: number;
        };
    }>;
}
