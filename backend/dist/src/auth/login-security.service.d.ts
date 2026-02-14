import { RedisService } from '../redis/redis.service';
export interface LoginAttemptResult {
    allowed: boolean;
    remainingAttempts: number;
    lockoutSeconds?: number;
    message?: string;
}
export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}
export interface PasswordPolicy {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    minStrength: number;
}
export declare class LoginSecurityService {
    private redisService;
    private readonly logger;
    private readonly MAX_ATTEMPTS;
    private readonly LOCKOUT_DURATION;
    private readonly ATTEMPT_WINDOW;
    private readonly KEY_PREFIX;
    private readonly LOCKOUT_PREFIX;
    private readonly passwordPolicy;
    constructor(redisService: RedisService);
    checkLoginAttempt(identifier: string): Promise<LoginAttemptResult>;
    recordFailedAttempt(identifier: string): Promise<LoginAttemptResult>;
    clearAttempts(identifier: string): Promise<void>;
    validatePassword(password: string): PasswordValidationResult;
    calculatePasswordStrength(password: string): number;
    getPasswordPolicy(): PasswordPolicy;
}
