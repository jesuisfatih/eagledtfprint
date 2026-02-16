import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class ShopifyService {
    private config;
    private prisma;
    private readonly logger;
    private readonly apiVersion;
    constructor(config: ConfigService, prisma: PrismaService);
    getMerchantAccessToken(merchantId: string): Promise<string>;
    getMerchantByShopDomain(shopDomain: string): Promise<{
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
    getApiVersion(): string;
    buildAdminApiUrl(shop: string, path: string): string;
    buildAdminGraphQLUrl(shop: string): string;
    graphqlRequest(merchantId: string, query: string, variables?: any): Promise<any>;
    sendDraftOrderInvoice(merchantId: string, shopifyDraftOrderId: string): Promise<any>;
    createDraftOrder(merchantId: string, input: any): Promise<any>;
}
