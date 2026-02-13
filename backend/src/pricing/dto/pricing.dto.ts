import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Discount Type Enum
 */
export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FIXED_PRICE = 'fixed_price',
  QTY_BREAKS = 'qty_breaks',
}

/**
 * Target Type Enum
 */
export enum TargetType {
  ALL = 'all',
  COMPANY = 'company',
  COMPANY_USER = 'company_user',
  COMPANY_GROUP = 'company_group',
  SEGMENT = 'segment',
  BUYER_INTENT = 'buyer_intent',
}

/**
 * Scope Type Enum
 */
export enum ScopeType {
  ALL = 'all',
  PRODUCTS = 'products',
  COLLECTIONS = 'collections',
  TAGS = 'tags',
  VARIANTS = 'variants',
}

/**
 * Calculate Prices DTO
 */
export class CalculatePricesDto {
  @IsArray()
  @IsString({ each: true })
  variantIds: string[];

  @IsOptional()
  quantities?: Record<string, number>;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cartTotal?: number;
}

/**
 * Pricing Rule DTO
 */
export class CreatePricingRuleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  // Target (Who?)
  @IsEnum(TargetType)
  targetType: TargetType;

  @IsString()
  @IsOptional()
  targetCompanyId?: string;

  @IsString()
  @IsOptional()
  targetCompanyUserId?: string;

  @IsString()
  @IsOptional()
  targetCompanyGroup?: string;

  // Scope (What?)
  @IsEnum(ScopeType)
  @IsOptional()
  scopeType?: ScopeType;

  @IsArray()
  @IsOptional()
  scopeProductIds?: string[];

  @IsArray()
  @IsOptional()
  scopeCollectionIds?: string[];

  @IsString()
  @IsOptional()
  scopeTags?: string;

  @IsArray()
  @IsOptional()
  scopeVariantIds?: string[];

  // Discount
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountValue?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  qtyBreaks?: any[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  minCartAmount?: number;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;
}

/**
 * Update Pricing Rule DTO
 */
export class UpdatePricingRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TargetType)
  @IsOptional()
  targetType?: TargetType;

  @IsString()
  @IsOptional()
  targetCompanyId?: string;

  @IsString()
  @IsOptional()
  targetCompanyUserId?: string;

  @IsString()
  @IsOptional()
  targetCompanyGroup?: string;

  @IsEnum(ScopeType)
  @IsOptional()
  scopeType?: ScopeType;

  @IsArray()
  @IsOptional()
  scopeProductIds?: string[];

  @IsArray()
  @IsOptional()
  scopeCollectionIds?: string[];

  @IsString()
  @IsOptional()
  scopeTags?: string;

  @IsArray()
  @IsOptional()
  scopeVariantIds?: string[];

  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountValue?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  qtyBreaks?: any[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  minCartAmount?: number;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;
}

/**
 * Toggle Rule DTO
 */
export class ToggleRuleDto {
  @IsBoolean()
  isActive: boolean;
}

/**
 * Get Rules Query DTO
 */
export class GetRulesQueryDto {
  @IsString()
  @IsOptional()
  isActive?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  companyUserId?: string;

  @IsString()
  @IsOptional()
  targetType?: string;
}
