import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class ShopifySsoService {
    private configService;
    private prisma;
    private readonly logger;
    private readonly apiVersion;
    constructor(configService: ConfigService, prisma: PrismaService);
    generateMultipassToken(multipassSecret: string, customerData: {
        email: string;
        firstName?: string;
        lastName?: string;
        customerId?: string;
        returnTo?: string;
    }): string;
    generateSsoUrl(shopDomain: string, multipassSecret: string, customerData: {
        email: string;
        firstName?: string;
        lastName?: string;
        customerId?: string;
        returnTo?: string;
    }): string;
    verifyShopifySession(shopDomain: string, accessToken: string, shopifyCustomerId: string): Promise<boolean>;
}
