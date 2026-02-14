export declare class AdminLoginDto {
    username: string;
    password: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    accountType: 'b2b' | 'normal';
    companyName?: string;
    taxId?: string;
    billingAddress: Record<string, any>;
    shippingAddress?: Record<string, any>;
    verificationCode?: string;
    skipEmailVerification?: boolean;
}
export declare class AcceptInvitationDto {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
}
export declare class SendVerificationCodeDto {
    email: string;
}
export declare class VerifyEmailCodeDto {
    email: string;
    code: string;
}
export declare class ShopifyCustomerSyncDto {
    shopifyCustomerId: string;
    email: string;
    fingerprint?: string;
}
export declare class ValidateTokenDto {
    token: string;
}
export declare class PasswordResetRequestDto {
    email: string;
}
export declare class PasswordResetDto {
    token: string;
    newPassword: string;
}
export declare class SsoUrlRequestDto {
    returnTo?: string;
}
export declare class MultipassGenerateDto {
    email: string;
    firstName?: string;
    lastName?: string;
    returnTo?: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class LogoutDto {
    refreshToken?: string;
    allDevices?: boolean;
}
