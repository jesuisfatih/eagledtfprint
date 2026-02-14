import { MerchantsService } from './merchants.service';
export declare class MerchantsController {
    private merchantsService;
    constructor(merchantsService: MerchantsService);
    getMe(merchantId: string): Promise<{
        id: string;
        shopDomain: string;
        shopifyShopId: bigint | null;
        accessToken: string;
        scope: string | null;
        planName: string;
        status: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        snippetEnabled: boolean;
        lastSyncAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    getStats(merchantId: string): Promise<{
        totalCompanies: number;
        totalUsers: number;
        totalOrders: number;
        totalRevenue: number | import("@prisma/client-runtime-utils").Decimal;
        totalProducts: number;
        avgOrderValue: number;
    }>;
    updateSettings(merchantId: string, settings: any): Promise<{
        id: string;
        shopDomain: string;
        shopifyShopId: bigint | null;
        accessToken: string;
        scope: string | null;
        planName: string;
        status: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        snippetEnabled: boolean;
        lastSyncAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    toggleSnippet(merchantId: string, enabled: boolean): Promise<{
        id: string;
        shopDomain: string;
        shopifyShopId: bigint | null;
        accessToken: string;
        scope: string | null;
        planName: string;
        status: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        snippetEnabled: boolean;
        lastSyncAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
