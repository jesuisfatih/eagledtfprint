import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
interface ShopifyCallbackParams {
    shop: string;
    code: string;
    hmac: string;
    timestamp: string;
    state: string;
}
export declare class ShopifyOauthService {
    private config;
    private prisma;
    private jwtService;
    private readonly logger;
    private readonly apiKey;
    private readonly apiSecret;
    private readonly scopes;
    private readonly apiVersion;
    private readonly redirectUri;
    constructor(config: ConfigService, prisma: PrismaService, jwtService: JwtService);
    getInstallUrl(shop: string): string;
    verifyHmac(params: ShopifyCallbackParams): boolean;
    getAccessToken(shop: string, code: string): Promise<string>;
    getShopDetails(shop: string, accessToken: string): Promise<any>;
    handleCallback(params: ShopifyCallbackParams): Promise<{
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
        accessToken: string;
    }>;
}
export {};
