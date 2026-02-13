import { IsString, IsEmail, IsOptional, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * DTO for cart item in tracking request
 */
export class CartItemDto {
  @IsNumber()
  shopifyVariantId: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  variantTitle?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

/**
 * DTO for tracking abandoned cart from snippet
 */
export class TrackCartDto {
  @IsOptional()
  @IsString()
  cartToken?: string;

  @IsOptional()
  @IsString()
  shopDomain?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items?: CartItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  checkoutUrl?: string;
}

/**
 * DTO for syncing Shopify cart data
 */
export class SyncCartDto {
  @IsOptional()
  @IsString()
  cartToken?: string;

  @IsOptional()
  @IsString()
  shopDomain?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  items?: any[]; // Shopify cart format varies

  @IsOptional()
  @IsNumber()
  total?: number;
}

/**
 * DTO for query parameters when fetching abandoned carts
 */
export class GetAbandonedCartsQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === 'True' || value === 'TRUE' || value === true) {
      return true;
    }
    return false;
  })
  includeRecent?: boolean = false;
}
