import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class SecurityHeadersMiddleware implements NestMiddleware {
    private readonly logger;
    use(req: Request, res: Response, next: NextFunction): void;
}
export declare function sanitizeString(input: string): string;
export declare function sanitizeObject<T extends Record<string, unknown>>(obj: T): T;
export declare function stripHtml(input: string): string;
export declare function isValidEmail(email: string): boolean;
export declare function isValidUrl(url: string): boolean;
export declare const rateLimitConfigs: {
    auth: {
        login: {
            limit: number;
            ttl: number;
        };
        register: {
            limit: number;
            ttl: number;
        };
        passwordReset: {
            limit: number;
            ttl: number;
        };
    };
    api: {
        read: {
            limit: number;
            ttl: number;
        };
        write: {
            limit: number;
            ttl: number;
        };
        sync: {
            limit: number;
            ttl: number;
        };
    };
    webhook: {
        shopify: {
            limit: number;
            ttl: number;
        };
    };
};
export declare const jwtSecurityConfig: {
    accessToken: {
        expiresIn: string;
        algorithm: "HS256";
    };
    refreshToken: {
        expiresIn: string;
        algorithm: "HS256";
    };
    minSecretLength: number;
};
export declare function validateJwtSecret(secret: string): {
    valid: boolean;
    issues: string[];
};
export declare const passwordRequirements: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
};
export declare function validatePasswordStrength(password: string): {
    valid: boolean;
    score: number;
    issues: string[];
};
export declare function detectSqlInjection(input: string): boolean;
export declare function detectXss(input: string): boolean;
export declare const allowedOrigins: string[];
export declare function isOriginAllowed(origin: string | undefined): boolean;
export declare const corsConfig: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
};
