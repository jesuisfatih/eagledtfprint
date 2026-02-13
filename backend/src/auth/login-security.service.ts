import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Login Attempt Result
 */
export interface LoginAttemptResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutSeconds?: number;
  message?: string;
}

/**
 * Password Validation Result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Password Policy Configuration
 */
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minStrength: number;
}

/**
 * Login Security Service
 * Handles login attempt tracking, lockouts, and password policies
 */
@Injectable()
export class LoginSecurityService {
  private readonly logger = new Logger(LoginSecurityService.name);
  
  // Configuration
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
  private readonly ATTEMPT_WINDOW = 60 * 60; // 1 hour in seconds
  private readonly KEY_PREFIX = 'login_attempts:';
  private readonly LOCKOUT_PREFIX = 'login_lockout:';

  private readonly passwordPolicy: PasswordPolicy = {
    minLength: 8,
    maxLength: 100,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false, // Optional for B2B ease of use
    minStrength: 2, // Basic strength requirement
  };

  constructor(private redisService: RedisService) {}

  /**
   * Check if login attempt is allowed for the given identifier (email or IP)
   */
  async checkLoginAttempt(identifier: string): Promise<LoginAttemptResult> {
    const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;
    const attemptKey = `${this.KEY_PREFIX}${identifier}`;

    try {
      // Check if currently locked out
      const lockoutTtl = await this.redisService.ttl(lockoutKey);
      if (lockoutTtl > 0) {
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutSeconds: lockoutTtl,
          message: `Account locked. Try again in ${Math.ceil(lockoutTtl / 60)} minutes.`,
        };
      }

      // Get current attempt count
      const attempts = await this.redisService.get(attemptKey);
      const attemptCount = attempts ? parseInt(attempts, 10) : 0;
      const remaining = Math.max(0, this.MAX_ATTEMPTS - attemptCount);

      return {
        allowed: remaining > 0,
        remainingAttempts: remaining,
        message: remaining <= 2 ? `${remaining} attempts remaining before lockout` : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to check login attempt: ${error.message}`);
      // Fail open - allow attempt but log the error
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(identifier: string): Promise<LoginAttemptResult> {
    const attemptKey = `${this.KEY_PREFIX}${identifier}`;
    const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;

    try {
      // Increment attempt counter
      const attempts = await this.redisService.incr(attemptKey);
      
      // Set expiry on first attempt
      if (attempts === 1) {
        await this.redisService.expire(attemptKey, this.ATTEMPT_WINDOW);
      }

      const remaining = Math.max(0, this.MAX_ATTEMPTS - attempts);

      // Check if we should lock out
      if (attempts >= this.MAX_ATTEMPTS) {
        // Create lockout
        await this.redisService.set(lockoutKey, '1', this.LOCKOUT_DURATION);
        
        this.logger.warn(`Account locked for ${identifier} after ${attempts} failed attempts`);
        
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutSeconds: this.LOCKOUT_DURATION,
          message: `Account locked for ${this.LOCKOUT_DURATION / 60} minutes due to too many failed attempts`,
        };
      }

      return {
        allowed: true,
        remainingAttempts: remaining,
        message: `Invalid credentials. ${remaining} attempts remaining.`,
      };
    } catch (error) {
      this.logger.error(`Failed to record failed attempt: ${error.message}`);
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }
  }

  /**
   * Clear failed attempts after successful login
   */
  async clearAttempts(identifier: string): Promise<void> {
    const attemptKey = `${this.KEY_PREFIX}${identifier}`;
    const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;

    try {
      await this.redisService.del(attemptKey);
      await this.redisService.del(lockoutKey);
    } catch (error) {
      this.logger.error(`Failed to clear attempts: ${error.message}`);
    }
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const policy = this.passwordPolicy;

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters`);
    }

    if (password.length > policy.maxLength) {
      errors.push(`Password must not exceed ${policy.maxLength} characters`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^123456/,
      /^password/i,
      /^qwerty/i,
      /^abc123/i,
      /^111111/,
      /^letmein/i,
    ];

    if (weakPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password is too common. Please choose a stronger password.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate password strength (0-4)
   */
  calculatePasswordStrength(password: string): number {
    let strength = 0;

    // Length score
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Complexity score
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

    // Variety penalty for repeated characters
    if (/(.)\1{2,}/.test(password)) strength--;

    return Math.max(0, Math.min(4, strength));
  }

  /**
   * Get password policy for frontend
   */
  getPasswordPolicy(): PasswordPolicy {
    return { ...this.passwordPolicy };
  }
}
