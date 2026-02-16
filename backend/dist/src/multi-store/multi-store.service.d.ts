import { DittofeedAdminService } from '../dittofeed/dittofeed-admin.service';
import { PrismaService } from '../prisma/prisma.service';
export interface StoreConfig {
    merchantId: string;
    storeName: string;
    domain: string;
    brandColor: string;
    logoUrl?: string;
    defaultFromEmail: string;
    features: {
        pickup: boolean;
        gangSheet: boolean;
        uvDtf: boolean;
        wholesale: boolean;
    };
}
export interface CrossStoreAnalytics {
    stores: Array<{
        merchantId: string;
        storeName: string;
        domain: string;
        totalRevenue: number;
        totalOrders: number;
        totalCustomers: number;
        avgOrderValue: number;
        topProduct: string;
        revenueGrowth: number;
    }>;
    combined: {
        totalRevenue: number;
        totalOrders: number;
        totalCustomers: number;
        uniqueCustomers: number;
        avgOrderValue: number;
    };
    crossStoreCustomers: number;
}
export interface ProductionLoadBalance {
    stores: Array<{
        merchantId: string;
        storeName: string;
        queuedJobs: number;
        printingJobs: number;
        totalActive: number;
        estimatedHoursToComplete: number;
        printerUtilization: number;
    }>;
    recommendation: string;
}
export declare class MultiStoreService {
    private readonly prisma;
    private readonly dittofeedAdmin;
    private readonly logger;
    constructor(prisma: PrismaService, dittofeedAdmin: DittofeedAdminService);
    onboardNewStore(config: StoreConfig): Promise<{
        store: any;
        dittofeed: any;
    }>;
    getCrossStoreAnalytics(): Promise<CrossStoreAnalytics>;
    private getCrossStoreCustomerCount;
    getProductionLoadBalance(): Promise<ProductionLoadBalance>;
    getStoreConfig(merchantId: string): Promise<StoreConfig | null>;
    listStores(): Promise<{
        merchantId: string;
        shopName: string;
        domain: string;
        createdAt: Date;
        totalOrders: number;
        totalCustomers: number;
    }[]>;
    getCrossStoreCustomers(limit?: number): Promise<{
        email: string;
        storeCount: number;
        totalOrders: number;
        totalSpent: number;
        stores: string;
    }[]>;
    getMobileFactoryDashboard(merchantId: string): Promise<{
        queue: {
            queued: any;
            printing: any;
            ready: any;
            completedToday: any;
        };
        printers: any;
        pickup: {
            pending: any;
        };
        timestamp: string;
    }>;
}
