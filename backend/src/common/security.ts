/**
 * Security Configuration for Eagle B2B Platform
 *
 * This module provides security utilities and configurations
 * for protecting the API against common vulnerabilities.
 */

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

// ============================================
// SECURITY HEADERS MIDDLEWARE
// ============================================

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        `connect-src 'self' ${process.env.API_URL || 'http://localhost:4000'} https://*.shopify.com wss://${(process.env.API_URL || '').replace('https://', '')}`,
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );

    // Prevent XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );

    // Remove server fingerprint
    res.removeHeader('X-Powered-By');

    next();
  }
}

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }

  return sanitized;
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// RATE LIMITING HELPERS
// ============================================

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Authentication endpoints - strict limits
  auth: {
    login: { limit: 5, ttl: 60000 }, // 5 per minute
    register: { limit: 3, ttl: 60000 }, // 3 per minute
    passwordReset: { limit: 3, ttl: 300000 }, // 3 per 5 minutes
  },

  // API endpoints - moderate limits
  api: {
    read: { limit: 100, ttl: 60000 }, // 100 per minute
    write: { limit: 30, ttl: 60000 }, // 30 per minute
    sync: { limit: 5, ttl: 60000 }, // 5 per minute
  },

  // Webhook endpoints - high limits
  webhook: {
    shopify: { limit: 1000, ttl: 60000 }, // 1000 per minute
  },
};

// ============================================
// JWT SECURITY
// ============================================

/**
 * JWT configuration recommendations
 */
export const jwtSecurityConfig = {
  // Access token - short lived
  accessToken: {
    expiresIn: '1h',
    algorithm: 'HS256' as const,
  },

  // Refresh token - longer lived
  refreshToken: {
    expiresIn: '7d',
    algorithm: 'HS256' as const,
  },

  // Minimum secret length
  minSecretLength: 32,
};

/**
 * Validate JWT secret strength
 */
export function validateJwtSecret(secret: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

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

// ============================================
// PASSWORD SECURITY
// ============================================

/**
 * Password strength requirements
 */
export const passwordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Optional but recommended
};

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  issues: string[]
} {
  const issues: string[] = [];
  let score = 0;

  if (password.length < passwordRequirements.minLength) {
    issues.push(`Password must be at least ${passwordRequirements.minLength} characters`);
  } else {
    score += 1;
  }

  if (password.length > passwordRequirements.maxLength) {
    issues.push(`Password must be less than ${passwordRequirements.maxLength} characters`);
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (passwordRequirements.requireNumbers && !/[0-9]/.test(password)) {
    issues.push('Password must contain at least one number');
  } else if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  }

  // Bonus for longer passwords
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  return {
    valid: issues.length === 0,
    score: Math.min(score, 5), // Max score of 5
    issues,
  };
}

// ============================================
// COMMON ATTACK PATTERNS
// ============================================

/**
 * SQL Injection patterns to detect
 */
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
  /('|"|;|--|\*|\/\*|\*\/)/,
  /(OR|AND)\s+\d+\s*=\s*\d+/i,
];

/**
 * Detect potential SQL injection
 */
export function detectSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
}

/**
 * XSS patterns to detect
 */
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

/**
 * Detect potential XSS attack
 */
export function detectXss(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return xssPatterns.some(pattern => pattern.test(input));
}

// ============================================
// CORS CONFIGURATION
// ============================================

/**
 * Allowed origins for CORS
 */
export const allowedOrigins = [
  process.env.ACCOUNTS_URL,
  process.env.ADMIN_URL,
  process.env.API_URL,
  // Development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4000',
].filter(Boolean) as string[];

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin) || origin.endsWith('.myshopify.com');
}

/**
 * CORS configuration
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || isOriginAllowed(origin)) {
      callback(null, true);
    } else {
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
  maxAge: 86400, // 24 hours
};
