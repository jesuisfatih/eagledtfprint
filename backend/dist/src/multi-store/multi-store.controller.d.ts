import { MultiStoreService } from './multi-store.service';
export declare class MultiStoreController {
    private readonly multiStoreService;
    constructor(multiStoreService: MultiStoreService);
    listStores(): Promise<{
        id: string;
        name: string;
        domain: string;
        shopifyStoreUrl: string;
        status: "CONNECTED";
        lastSyncAt: string;
        orderCount: number;
        revenue: number;
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
            queued: number;
            printing: number;
            ready: number;
            completedToday: number;
        };
        printers: {
            id: string;
            name: string;
            status: import("@prisma/client/client").$Enums.PrinterStatus;
            inkLevels: {
                cyan: number | null;
                magenta: number | null;
                yellow: number | null;
                black: number | null;
                white: number | null;
            };
            lowInk: boolean;
        }[];
        pickup: {
            pending: any;
        };
        timestamp: string;
    }>;
}
