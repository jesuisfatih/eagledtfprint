"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LoginSecurityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginSecurityService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
let LoginSecurityService = LoginSecurityService_1 = class LoginSecurityService {
    redisService;
    logger = new common_1.Logger(LoginSecurityService_1.name);
    MAX_ATTEMPTS = 5;
    LOCKOUT_DURATION = 15 * 60;
    ATTEMPT_WINDOW = 60 * 60;
    KEY_PREFIX = 'login_attempts:';
    LOCKOUT_PREFIX = 'login_lockout:';
    passwordPolicy = {
        minLength: 8,
        maxLength: 100,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        minStrength: 2,
    };
    constructor(redisService) {
        this.redisService = redisService;
    }
    async checkLoginAttempt(identifier) {
        const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;
        const attemptKey = `${this.KEY_PREFIX}${identifier}`;
        try {
            const lockoutTtl = await this.redisService.ttl(lockoutKey);
            if (lockoutTtl > 0) {
                return {
                    allowed: false,
                    remainingAttempts: 0,
                    lockoutSeconds: lockoutTtl,
                    message: `Account locked. Try again in ${Math.ceil(lockoutTtl / 60)} minutes.`,
                };
            }
            const attempts = await this.redisService.get(attemptKey);
            const attemptCount = attempts ? parseInt(attempts, 10) : 0;
            const remaining = Math.max(0, this.MAX_ATTEMPTS - attemptCount);
            return {
                allowed: remaining > 0,
                remainingAttempts: remaining,
                message: remaining <= 2 ? `${remaining} attempts remaining before lockout` : undefined,
            };
        }
        catch (error) {
            this.logger.error(`Failed to check login attempt: ${error.message}`);
            return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
        }
    }
    async recordFailedAttempt(identifier) {
        const attemptKey = `${this.KEY_PREFIX}${identifier}`;
        const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;
        try {
            const attempts = await this.redisService.incr(attemptKey);
            if (attempts === 1) {
                await this.redisService.expire(attemptKey, this.ATTEMPT_WINDOW);
            }
            const remaining = Math.max(0, this.MAX_ATTEMPTS - attempts);
            if (attempts >= this.MAX_ATTEMPTS) {
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
        }
        catch (error) {
            this.logger.error(`Failed to record failed attempt: ${error.message}`);
            return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
        }
    }
    async clearAttempts(identifier) {
        const attemptKey = `${this.KEY_PREFIX}${identifier}`;
        const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;
        try {
            await this.redisService.del(attemptKey);
            await this.redisService.del(lockoutKey);
        }
        catch (error) {
            this.logger.error(`Failed to clear attempts: ${error.message}`);
        }
    }
    validatePassword(password) {
        const errors = [];
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
    calculatePasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8)
            strength++;
        if (password.length >= 12)
            strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password))
            strength++;
        if (/\d/.test(password))
            strength++;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
            strength++;
        if (/(.)\1{2,}/.test(password))
            strength--;
        return Math.max(0, Math.min(4, strength));
    }
    getPasswordPolicy() {
        return { ...this.passwordPolicy };
    }
};
exports.LoginSecurityService = LoginSecurityService;
exports.LoginSecurityService = LoginSecurityService = LoginSecurityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], LoginSecurityService);
//# sourceMappingURL=login-security.service.js.map