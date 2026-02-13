import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class AddToWishlistDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsString()
  @IsOptional()
  productTitle?: string;

  @IsString()
  @IsOptional()
  variantTitle?: string;

  @IsString()
  @IsOptional()
  productImage?: string;

  @IsNumber()
  @IsOptional()
  price?: number;
}
