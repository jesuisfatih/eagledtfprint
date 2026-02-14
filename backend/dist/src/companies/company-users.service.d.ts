import { PrismaService } from '../prisma/prisma.service';
import { ShopifyRestService } from '../shopify/shopify-rest.service';
export declare class CompanyUsersService {
    private prisma;
    private shopifyRest;
    private readonly logger;
    constructor(prisma: PrismaService, shopifyRest: ShopifyRestService);
    findByCompany(companyId: string): Promise<{
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
    }[]>;
    findById(userId: string): Promise<({
        company: {
            name: string;
            merchant: {
                shopDomain: string;
            };
            id: string;
        };
    } & {
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
    }) | null>;
    invite(companyId: string, data: {
        email: string;
        role?: string;
    }): Promise<{
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
    }>;
    update(userId: string, data: any): Promise<{
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
    }>;
    delete(userId: string): Promise<{
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
    }>;
    verifyEmail(userId: string): Promise<{
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
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getNotificationPreferences(userId: string): Promise<any>;
    updateNotificationPreferences(userId: string, preferences: any): Promise<any>;
    resendInvitation(companyId: string, email: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
