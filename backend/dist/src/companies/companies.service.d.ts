import { PrismaService } from '../prisma/prisma.service';
import { ShopifyCompanySyncService } from './shopify-company-sync.service';
export declare class CompaniesService {
    private prisma;
    private shopifyCompanySync;
    constructor(prisma: PrismaService, shopifyCompanySync: ShopifyCompanySyncService);
    findAll(merchantId: string, filters?: {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<import("../common/utils/pagination.util").PaginatedResponse<{
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        phone: string | null;
        _count: {
            orders: number;
            users: number;
        };
        users: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            isActive: boolean;
            role: string;
            lastLoginAt: Date | null;
        }[];
    }>>;
    findOne(id: string, merchantId: string): Promise<{
        merchant: {
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
        };
        orders: {
            id: string;
            createdAt: Date;
            shopifyOrderId: bigint;
            shopifyOrderNumber: string | null;
            totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
            financialStatus: string | null;
        }[];
        pricingRules: {
            name: string;
            id: string;
            discountType: string;
            discountValue: import("@prisma/client-runtime-utils").Decimal | null;
            priority: number;
        }[];
        users: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            isActive: boolean;
            role: string;
            lastLoginAt: Date | null;
        }[];
    } & {
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
    create(merchantId: string, data: any): Promise<{
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
    approve(id: string, merchantId: string): Promise<{
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
    reject(id: string, merchantId: string, reason?: string): Promise<{
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
    update(id: string, merchantId: string, data: any): Promise<{
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
    delete(id: string, merchantId: string): Promise<{
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
    getStats(merchantId: string): Promise<{
        total: number;
        active: number;
        pending: number;
        suspended: number;
        totalUsers: number;
    }>;
}
