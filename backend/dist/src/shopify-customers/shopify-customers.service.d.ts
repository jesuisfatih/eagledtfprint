import { PrismaService } from '../prisma/prisma.service';
export declare class ShopifyCustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(merchantId: string, filters?: {
        search?: string;
        segment?: string;
        churnRisk?: string;
        clvTier?: string;
    }): Promise<any[]>;
    findOne(id: string): Promise<any>;
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
