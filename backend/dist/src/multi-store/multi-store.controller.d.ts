import { MultiStoreService } from './multi-store.service';
export declare class MultiStoreController {
    private readonly multiStoreService;
    constructor(multiStoreService: MultiStoreService);
    listStores(): Promise<{
        merchantId: string;
        shopName: string;
        domain: string;
        createdAt: Date;
        totalOrders: number;
        totalCustomers: number;
    }[]>;
    getStoreConfig(merchantId: string): Promise<import("./multi-store.service").StoreConfig | null>;
    onboardStore(body: any): Promise<{
        store: any;
        dittofeed: any;
    }>;
    getCrossStoreAnalytics(): Promise<import("./multi-store.service").CrossStoreAnalytics>;
    getCrossStoreCustomers(limit?: string): Promise<{
        email: string;
        storeCount: number;
        totalOrders: number;
        totalSpent: number;
        stores: string;
    }[]>;
    getLoadBalance(): Promise<import("./multi-store.service").ProductionLoadBalance>;
    getMobileDashboard(merchantId: string): Promise<{
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
