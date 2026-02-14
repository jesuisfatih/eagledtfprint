import { PrismaService } from '../prisma/prisma.service';
export declare class SettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getMerchantSettings(merchantId: string): Promise<{
        stats: {
            totalCustomers: number;
            syncedCustomers: number;
            totalProducts: number;
            totalOrders: number;
        };
        id?: string | undefined;
        shopDomain?: string | undefined;
        planName?: string | undefined;
        settings?: import("@prisma/client/runtime/client").JsonValue | undefined;
        snippetEnabled?: boolean | undefined;
        lastSyncAt?: Date | null | undefined;
    }>;
    updateMerchantSettings(merchantId: string, settings: any): Promise<{
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
    getCompanySettings(companyId: string): Promise<{
        status: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        companyGroup: string | null;
    } | null>;
    updateCompanySettings(companyId: string, settings: any): Promise<{
        name: string;
        id: string;
        status: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        email: string | null;
        phone: string | null;
        legalName: string | null;
        taxId: string | null;
        website: string | null;
        billingAddress: import("@prisma/client/runtime/client").JsonValue | null;
        shippingAddress: import("@prisma/client/runtime/client").JsonValue | null;
        companyGroup: string | null;
        createdByShopifyCustomerId: bigint | null;
    }>;
    getSsoSettings(merchantId: string): Promise<{
        mode: any;
        multipassSecret: any;
        storefrontToken: any;
    }>;
    updateSsoSettings(merchantId: string, ssoSettings: {
        mode: string;
        multipassSecret?: string;
        storefrontToken?: string;
    }): Promise<{
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
