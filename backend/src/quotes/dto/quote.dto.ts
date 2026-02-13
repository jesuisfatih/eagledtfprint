import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, Min, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Quote Item DTO
 */
export class QuoteItemDto {
  @IsString()
  productId: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  requestedPrice?: number;
}

/**
 * Create Quote DTO
 */
export class CreateQuoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  poNumber?: string;
}

/**
 * Update Quote Status DTO
 */
export class UpdateQuoteStatusDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  responseNotes?: string;
}
