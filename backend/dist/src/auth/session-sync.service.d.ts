import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyService } from '../shopify/shopify.service';
export declare class SessionSyncService {
    private prisma;
    private shopify;
    private jwtService;
    private readonly logger;
    constructor(prisma: PrismaService, shopify: ShopifyService, jwtService: JwtService);
    syncFromShopify(shopifyCustomerId: string, email: string, fingerprint?: string): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            companyId: string;
        };
    }>;
    resolveContext(userId: string): Promise<{
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
    }>;
    private getOrCreateProspectCompany;
}
