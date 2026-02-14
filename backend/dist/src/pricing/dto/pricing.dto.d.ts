export declare enum DiscountType {
    PERCENTAGE = "percentage",
    FIXED_AMOUNT = "fixed_amount",
    FIXED_PRICE = "fixed_price",
    QTY_BREAKS = "qty_breaks"
}
export declare enum TargetType {
    ALL = "all",
    COMPANY = "company",
    COMPANY_USER = "company_user",
    COMPANY_GROUP = "company_group",
    SEGMENT = "segment",
    BUYER_INTENT = "buyer_intent"
}
export declare enum ScopeType {
    ALL = "all",
    PRODUCTS = "products",
    COLLECTIONS = "collections",
    TAGS = "tags",
    VARIANTS = "variants"
}
export declare class CalculatePricesDto {
    variantIds: string[];
    quantities?: Record<string, number>;
    cartTotal?: number;
}
export declare class CreatePricingRuleDto {
    name: string;
    description?: string;
    targetType: TargetType;
    targetCompanyId?: string;
    targetCompanyUserId?: string;
    targetCompanyGroup?: string;
    scopeType?: ScopeType;
    scopeProductIds?: string[];
    scopeCollectionIds?: string[];
    scopeTags?: string;
    scopeVariantIds?: string[];
    discountType: DiscountType;
    discountValue?: number;
    discountPercentage?: number;
    qtyBreaks?: any[];
    minCartAmount?: number;
    priority?: number;
    isActive?: boolean;
    validFrom?: string;
    validUntil?: string;
}
export declare class UpdatePricingRuleDto {
    name?: string;
    description?: string;
    targetType?: TargetType;
    targetCompanyId?: string;
    targetCompanyUserId?: string;
    targetCompanyGroup?: string;
    scopeType?: ScopeType;
    scopeProductIds?: string[];
    scopeCollectionIds?: string[];
    scopeTags?: string;
    scopeVariantIds?: string[];
    discountType?: DiscountType;
    discountValue?: number;
    discountPercentage?: number;
    qtyBreaks?: any[];
    minCartAmount?: number;
    priority?: number;
    isActive?: boolean;
    validFrom?: string;
    validUntil?: string;
}
export declare class ToggleRuleDto {
    isActive: boolean;
}
export declare class GetRulesQueryDto {
    isActive?: string;
    companyId?: string;
    companyUserId?: string;
    targetType?: string;
}
