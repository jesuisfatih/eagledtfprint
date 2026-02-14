import { PrismaService } from '../prisma/prisma.service';
export interface PricingContext {
    merchantId: string;
    companyId: string;
    companyUserId?: string;
    variantIds: bigint[];
    quantities?: {
        [variantId: string]: number;
    };
    cartTotal?: number;
}
export interface CalculatedPrice {
    variantId: bigint;
    listPrice: number;
    companyPrice: number;
    discount: number;
    discountPercentage: number;
    appliedRuleId?: string;
    appliedRuleName?: string;
}
export declare class PricingCalculatorService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    calculatePrices(context: PricingContext): Promise<CalculatedPrice[]>;
    private getApplicableRules;
    private findBestRule;
    private isRuleApplicable;
    private applyRule;
    calculateCartPricing(cartId: string): Promise<{
        subtotal: number;
        discountTotal: number;
        total: number;
        appliedRules: string[];
    }>;
}
