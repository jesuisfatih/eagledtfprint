import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SessionSyncService } from './session-sync.service';
import { LoginSecurityService } from './login-security.service';
import { ShopifySsoService } from '../shopify/shopify-sso.service';
import { ShopifyCustomerSyncService } from '../shopify/shopify-customer-sync.service';
import { ShopifyRestService } from '../shopify/shopify-rest.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyOauthService } from './shopify-oauth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminLoginDto, LoginDto, RegisterDto, AcceptInvitationDto, SendVerificationCodeDto, VerifyEmailCodeDto, ShopifyCustomerSyncDto, PasswordResetRequestDto, PasswordResetDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    private sessionSyncService;
    private loginSecurity;
    private shopifySso;
    private shopifyCustomerSync;
    private shopifyRest;
    private prisma;
    private shopifyOauth;
    private config;
    private jwtService;
    private readonly logger;
    private readonly adminUrl;
    constructor(authService: AuthService, sessionSyncService: SessionSyncService, loginSecurity: LoginSecurityService, shopifySso: ShopifySsoService, shopifyCustomerSync: ShopifyCustomerSyncService, shopifyRest: ShopifyRestService, prisma: PrismaService, shopifyOauth: ShopifyOauthService, config: ConfigService, jwtService: JwtService);
    private readonly adminUsername;
    private readonly adminPassword;
    adminLogin(dto: AdminLoginDto, res: Response): Promise<Response<any, Record<string, any>>>;
    login(dto: LoginDto, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    shopifyCallback(shopifyCustomerId: string, email: string, res: Response): Promise<void>;
    validateInvitation(token: string, res: Response): Promise<Response<any, Record<string, any>>>;
    sendVerificationCode(dto: SendVerificationCodeDto, res: Response): Promise<Response<any, Record<string, any>>>;
    verifyEmailCode(dto: VerifyEmailCodeDto, res: Response): Promise<Response<any, Record<string, any>>>;
    requestInvitation(body: {
        email: string;
        companyName: string;
        contactName: string;
        phone?: string;
        website?: string;
        industry?: string;
        estimatedMonthlyVolume?: string;
        message?: string;
    }, res: Response): Promise<Response<any, Record<string, any>>>;
    forgotPassword(dto: PasswordResetRequestDto, res: Response): Promise<Response<any, Record<string, any>>>;
    resetPassword(dto: PasswordResetDto, res: Response): Promise<Response<any, Record<string, any>>>;
    register(dto: RegisterDto, res: Response): Promise<Response<any, Record<string, any>>>;
    acceptInvitation(dto: AcceptInvitationDto): Promise<{
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
    syncShopifyCustomer(dto: ShopifyCustomerSyncDto): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            companyId: string;
        };
    }>;
    resolveContext(auth: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: string;
        };
        company: {
            id: string;
            name: string;
            status: string;
        };
        pricing: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            merchantId: string;
            description: string | null;
            targetType: string;
            targetCompanyId: string | null;
            targetCompanyUserId: string | null;
            targetCompanyGroup: string | null;
            scopeType: string;
            scopeProductIds: bigint[];
            scopeCollectionIds: bigint[];
            scopeTags: string | null;
            scopeVariantIds: bigint[];
            discountType: string;
            discountValue: import("@prisma/client-runtime-utils").Decimal | null;
            discountPercentage: import("@prisma/client-runtime-utils").Decimal | null;
            qtyBreaks: import("@prisma/client/runtime/client").JsonValue | null;
            minCartAmount: import("@prisma/client-runtime-utils").Decimal | null;
            priority: number;
            isActive: boolean;
            validFrom: Date | null;
            validUntil: Date | null;
        }[];
        shopifyCustomerId: string | undefined;
    } | {
        error: string;
    }>;
    refreshToken(body: {
        token: string;
    }, res: Response): Promise<Response<any, Record<string, any>>>;
    ping(res: Response): Promise<Response<any, Record<string, any>>>;
    validateToken(body: {
        token: string;
    }, res: Response): Promise<Response<any, Record<string, any>>>;
    getShopifySsoUrl(user: any, body: {
        returnTo?: string;
    }, res: Response): Promise<Response<any, Record<string, any>>>;
    getCurrentUser(token: string, res: Response): Promise<Response<any, Record<string, any>>>;
    shopifyInstall(shop: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
    shopifyOauthCallback(code: string, shop: string, hmac: string, timestamp: string, state: string, res: Response): Promise<void>;
    getPasswordPolicy(): Promise<{
        success: boolean;
        policy: import("./login-security.service").PasswordPolicy;
    }>;
    validatePassword(body: {
        password: string;
    }): Promise<{
        success: boolean;
        valid: boolean;
        errors: string[];
        strength: number;
        strengthLabel: string;
    }>;
    private getStrengthLabel;
}
