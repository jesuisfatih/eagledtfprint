import { PrismaService } from '../prisma/prisma.service';
export declare class DiscountEngineService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateDiscountCode(merchantId: string, companyId: string, cartId: string, discountAmount: number): Promise<string>;
    validateDiscountCode(code: string, merchantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        companyId: string | null;
        cartId: string | null;
        discountType: string | null;
        isActive: boolean;
        validFrom: Date | null;
        validUntil: Date | null;
        code: string;
        shopifyDiscountId: bigint | null;
        value: import("@prisma/client-runtime-utils").Decimal | null;
        usageLimit: number | null;
        usedCount: number;
    } | null>;
    markDiscountUsed(code: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
