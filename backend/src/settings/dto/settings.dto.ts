import { IsString, IsBoolean, IsOptional, IsEmail, IsObject, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Merchant Settings DTO
 */
export class UpdateMerchantSettingsDto {
  @IsString()
  @IsOptional()
  shopDomain?: string;

  @IsString()
  @IsOptional()
  storeName?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsBoolean()
  @IsOptional()
  snippetEnabled?: boolean;
}

/**
 * Company Settings DTO
 */
export class UpdateCompanySettingsDto {
  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  quoteNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  orderNotifications?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(90)
  netTermsDays?: number;

  @IsString()
  @IsOptional()
  preferredPaymentMethod?: string;
}

/**
 * SSO Settings DTO
 */
export class UpdateSsoSettingsDto {
  @IsString()
  mode: string;

  @IsString()
  @IsOptional()
  multipassSecret?: string;

  @IsString()
  @IsOptional()
  storefrontToken?: string;
}

/**
 * Toggle Snippet DTO
 */
export class ToggleSnippetDto {
  @IsBoolean()
  enabled: boolean;
}
