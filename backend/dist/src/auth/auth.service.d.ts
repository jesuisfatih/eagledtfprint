import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ShopifyCustomerSyncService } from '../shopify/shopify-customer-sync.service';
import { ShopifyRestService } from '../shopify/shopify-rest.service';
export interface JwtPayload {
    sub: string;
    email: string;
    type: 'merchant' | 'company_user';
    merchantId?: string;
    companyId?: string;
}
export declare class AuthService {
    private prisma;
    private jwtService;
    private config;
    private shopifyCustomerSync;
    private shopifyRest;
    private mailService;
    private redisService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService, shopifyCustomerSync: ShopifyCustomerSyncService, shopifyRest: ShopifyRestService, mailService: MailService, redisService: RedisService);
    hashPassword(password: string): Promise<string>;
    comparePasswords(password: string, hash: string): Promise<boolean>;
    generateToken(payload: JwtPayload): Promise<string>;
    generateRefreshToken(payload: JwtPayload): Promise<string>;
    verifyToken(token: string): Promise<JwtPayload>;
    validateCompanyUser(email: string, password: string): Promise<{
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
    loginCompanyUser(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: string;
            companyId: string;
            merchantId: string;
        };
    }>;
    validateUser(email: string, password: string): Promise<any>;
    findUserByEmail(email: string): Promise<any>;
    createUserFromShopify(data: {
        email: string;
        shopifyCustomerId: string;
        merchantId?: string;
    }): Promise<any>;
    refreshToken(oldToken: string): Promise<string | null>;
    validateToken(token: string): Promise<any>;
    sendVerificationCode(email: string): Promise<{
        success: boolean;
        message: string;
        code: string | undefined;
    }>;
    verifyEmailCode(email: string, code: string): Promise<boolean>;
    register(body: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone: string;
        accountType: 'b2b' | 'normal';
        companyName?: string;
        taxId?: string;
        billingAddress: any;
        shippingAddress?: any;
        verificationCode?: string;
        skipEmailVerification?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            email: string;
            companyId: string;
            status: string;
        };
    }>;
    acceptInvitation(body: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: string;
            companyId: string;
        };
    }>;
    requestPasswordReset(email: string): Promise<{
        success: boolean;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        success: boolean;
        message?: string;
    }>;
}
