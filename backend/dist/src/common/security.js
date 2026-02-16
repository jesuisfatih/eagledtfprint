"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SecurityHeadersMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsConfig = exports.allowedOrigins = exports.passwordRequirements = exports.jwtSecurityConfig = exports.rateLimitConfigs = exports.SecurityHeadersMiddleware = void 0;
exports.sanitizeString = sanitizeString;
exports.sanitizeObject = sanitizeObject;
exports.stripHtml = stripHtml;
exports.isValidEmail = isValidEmail;
exports.isValidUrl = isValidUrl;
exports.validateJwtSecret = validateJwtSecret;
exports.validatePasswordStrength = validatePasswordStrength;
exports.detectSqlInjection = detectSqlInjection;
exports.detectXss = detectXss;
exports.isOriginAllowed = isOriginAllowed;
const common_1 = require("@nestjs/common");
let SecurityHeadersMiddleware = SecurityHeadersMiddleware_1 = class SecurityHeadersMiddleware {
    logger = new common_1.Logger(SecurityHeadersMiddleware_1.name);
    use(req, res, next) {
        res.setHeader('Content-Security-Policy', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            `connect-src 'self' ${process.env.API_URL || 'http://localhost:4000'} https://*.shopify.com wss://${(process.env.API_URL || '').replace('https://', '')}`,
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '));
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
        res.removeHeader('X-Powered-By');
        next();
    }
};
exports.SecurityHeadersMiddleware = SecurityHeadersMiddleware;
exports.SecurityHeadersMiddleware = SecurityHeadersMiddleware = SecurityHeadersMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], SecurityHeadersMiddleware);
function sanitizeString(input) {
    if (!input || typeof input !== 'string')
        return input;
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object')
        return obj;
    const sanitized = { ...obj };
    for (const key of Object.keys(sanitized)) {
        const value = sanitized[key];
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        }
        else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        }
    }
    return sanitized;
}
function stripHtml(input) {
    if (!input || typeof input !== 'string')
        return input;
    return input.replace(/<[^>]*>/g, '');
}
function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
exports.rateLimitConfigs = {
    auth: {
        login: { limit: 5, ttl: 60000 },
        register: { limit: 3, ttl: 60000 },
        passwordReset: { limit: 3, ttl: 300000 },
    },
    api: {
        read: { limit: 100, ttl: 60000 },
        write: { limit: 30, ttl: 60000 },
        sync: { limit: 5, ttl: 60000 },
    },
    webhook: {
        shopify: { limit: 1000, ttl: 60000 },
    },
};
exports.jwtSecurityConfig = {
    accessToken: {
        expiresIn: '1h',
        algorithm: 'HS256',
    },
    refreshToken: {
        expiresIn: '7d',
        algorithm: 'HS256',
    },
    minSecretLength: 32,
};
function validateJwtSecret(secret) {
    const issues = [];
    if (!secret || secret.length < 32) {
        issues.push('JWT secret should be at least 32 characters long');
    }
    if (!/[a-z]/.test(secret)) {
        issues.push('JWT secret should contain lowercase letters');
    }
    if (!/[A-Z]/.test(secret)) {
        issues.push('JWT secret should contain uppercase letters');
    }
    if (!/[0-9]/.test(secret)) {
        issues.push('JWT secret should contain numbers');
    }
    if (!/[!@#$%^&*]/.test(secret)) {
        issues.push('JWT secret should contain special characters');
    }
    return {
        valid: issues.length === 0,
        issues,
    };
}
exports.passwordRequirements = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
};
function validatePasswordStrength(password) {
    const issues = [];
    let score = 0;
    if (password.length < exports.passwordRequirements.minLength) {
        issues.push(`Password must be at least ${exports.passwordRequirements.minLength} characters`);
    }
    else {
        score += 1;
    }
    if (password.length > exports.passwordRequirements.maxLength) {
        issues.push(`Password must be less than ${exports.passwordRequirements.maxLength} characters`);
    }
    if (exports.passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
        issues.push('Password must contain at least one uppercase letter');
    }
    else if (/[A-Z]/.test(password)) {
        score += 1;
    }
    if (exports.passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
        issues.push('Password must contain at least one lowercase letter');
    }
    else if (/[a-z]/.test(password)) {
        score += 1;
    }
    if (exports.passwordRequirements.requireNumbers && !/[0-9]/.test(password)) {
        issues.push('Password must contain at least one number');
    }
    else if (/[0-9]/.test(password)) {
        score += 1;
    }
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        score += 1;
    }
    if (password.length >= 12)
        score += 1;
    if (password.length >= 16)
        score += 1;
    return {
        valid: issues.length === 0,
        score: Math.min(score, 5),
        issues,
    };
}
const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /('|"|;|--|\*|\/\*|\*\/)/,
    /(OR|AND)\s+\d+\s*=\s*\d+/i,
];
function detectSqlInjection(input) {
    if (!input || typeof input !== 'string')
        return false;
    return sqlInjectionPatterns.some(pattern => pattern.test(input));
}
const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
];
function detectXss(input) {
    if (!input || typeof input !== 'string')
        return false;
    return xssPatterns.some(pattern => pattern.test(input));
}
exports.allowedOrigins = [
    process.env.ACCOUNTS_URL,
    process.env.ADMIN_URL,
    process.env.API_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4000',
].filter(Boolean);
function isOriginAllowed(origin) {
    if (!origin)
        return false;
    return exports.allowedOrigins.includes(origin) || origin.endsWith('.myshopify.com');
}
exports.corsConfig = {
    origin: (origin, callback) => {
        if (!origin || isOriginAllowed(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Shop-Domain',
        'Origin',
        'Accept',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400,
};
//# sourceMappingURL=security.js.map