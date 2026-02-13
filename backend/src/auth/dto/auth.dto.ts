import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional, IsBoolean, Matches, IsIn, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Admin Login DTO - Simple username/password
 */
export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(100)
  password: string;
}

/**
 * User Login DTO
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}

/**
 * User Registration DTO
 */
export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['b2b', 'normal'])
  accountType: 'b2b' | 'normal';

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  companyName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  @IsObject()
  @IsNotEmpty()
  billingAddress: Record<string, any>;

  @IsObject()
  @IsOptional()
  shippingAddress?: Record<string, any>;

  @IsString()
  @IsOptional()
  verificationCode?: string;

  @IsBoolean()
  @IsOptional()
  skipEmailVerification?: boolean;
}

/**
 * Invitation Acceptance DTO
 */
export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;
}

/**
 * Email Verification Code DTO
 */
export class SendVerificationCodeDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}

/**
 * Verify Email Code DTO
 */
export class VerifyEmailCodeDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(10)
  code: string;
}

/**
 * Shopify Customer Sync DTO
 */
export class ShopifyCustomerSyncDto {
  @IsString()
  @IsNotEmpty()
  shopifyCustomerId: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsOptional()
  fingerprint?: string;
}

/**
 * Token Validation DTO
 */
export class ValidateTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

/**
 * Password Reset Request DTO
 */
export class PasswordResetRequestDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}

/**
 * Password Reset DTO
 */
export class PasswordResetDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}

/**
 * SSO URL Request DTO
 */
export class SsoUrlRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  returnTo?: string;
}

/**
 * Multipass Generate DTO - for generating Multipass tokens
 */
export class MultipassGenerateDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  returnTo?: string;
}

/**
 * Refresh Token DTO
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

/**
 * Logout DTO
 */
export class LogoutDto {
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsBoolean()
  @IsOptional()
  allDevices?: boolean;
}
