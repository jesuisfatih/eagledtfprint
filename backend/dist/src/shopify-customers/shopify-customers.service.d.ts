import { PrismaService } from '../prisma/prisma.service';
export declare class ShopifyCustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(merchantId: string, filters?: {
        search?: string;
    }): Promise<{
        shopifyCustomerId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        addresses: import("@prisma/client/runtime/client").JsonValue | null;
        tags: string | null;
        note: string | null;
        totalSpent: import("@prisma/client-runtime-utils").Decimal | null;
        ordersCount: number;
        rawData: import("@prisma/client/runtime/client").JsonValue | null;
        syncedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        shopifyCustomerId: bigint;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        addresses: import("@prisma/client/runtime/client").JsonValue | null;
        tags: string | null;
        note: string | null;
        totalSpent: import("@prisma/client-runtime-utils").Decimal | null;
        ordersCount: number;
        rawData: import("@prisma/client/runtime/client").JsonValue | null;
        syncedAt: Date;
    } | null>;
    convertToCompany(customerId: string, merchantId: string): Promise<{
        company: {
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
        };
        companyUser: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            shopifyCustomerId: bigint | null;
            email: string;
            firstName: string | null;
            lastName: string | null;
            companyId: string;
            isActive: boolean;
            passwordHash: string | null;
            role: string;
            permissions: import("@prisma/client/runtime/client").JsonValue;
            lastLoginAt: Date | null;
            invitationToken: string | null;
            invitationSentAt: Date | null;
            invitationAcceptedAt: Date | null;
        };
    }>;
}
