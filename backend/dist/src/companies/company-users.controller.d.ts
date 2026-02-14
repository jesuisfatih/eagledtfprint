import { CompanyUsersService } from './company-users.service';
export declare class CompanyUsersController {
    private companyUsersService;
    constructor(companyUsersService: CompanyUsersService);
    getMyProfile(userId: string): Promise<{
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
    }>;
    updateMyProfile(userId: string, body: {
        firstName?: string;
        lastName?: string;
        phone?: string;
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
    changePassword(userId: string, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getNotificationPreferences(userId: string): Promise<any>;
    updateNotificationPreferences(userId: string, preferences: {
        orderUpdates?: boolean;
        promotions?: boolean;
        quoteAlerts?: boolean;
        teamActivity?: boolean;
        weeklyDigest?: boolean;
    }): Promise<any>;
    updateUserRole(userId: string, body: {
        role: string;
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
    updateUserStatus(userId: string, body: {
        isActive: boolean;
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
}
