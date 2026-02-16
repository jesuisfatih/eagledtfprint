"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    config;
    logger = new common_1.Logger(MailService_1.name);
    transporter = null;
    fromEmail;
    fromName;
    isConfigured;
    constructor(config) {
        this.config = config;
        const smtpHost = this.config.get('SMTP_HOST');
        const smtpPort = this.config.get('SMTP_PORT');
        const smtpUser = this.config.get('SMTP_USER');
        const smtpPass = this.config.get('SMTP_PASS');
        this.fromEmail = this.config.get('MAIL_FROM', 'noreply@eagle-engine.dev');
        this.fromName = this.config.get('MAIL_FROM_NAME', 'Eagle B2B');
        this.isConfigured = !!(smtpHost && smtpUser && smtpPass);
        if (this.isConfigured) {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort || 587,
                secure: smtpPort === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });
            this.logger.log('Mail service configured with SMTP');
        }
        else {
            this.logger.warn('Mail service not configured - emails will be logged only');
        }
    }
    async sendMail(to, subject, html, text) {
        if (!this.isConfigured || !this.transporter) {
            this.logger.log(`📧 [DEV MODE] Would send email to ${to}: ${subject}`);
            this.logger.debug(`Email content: ${text || html}`);
            return { success: true, mode: 'development' };
        }
        try {
            const result = await this.transporter.sendMail({
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to,
                subject,
                text: text || html.replace(/<[^>]*>/g, ''),
                html,
            });
            this.logger.log(`📧 Email sent to ${to}: ${result.messageId}`);
            return { success: true, messageId: result.messageId };
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error);
            throw error;
        }
    }
    async sendInvitation(email, companyName, invitationUrl) {
        const brandName = this.fromName;
        const subject = `You've been invited to join ${companyName} on ${brandName}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a2e;">Welcome to ${brandName}</h1>
        <p>You've been invited to join <strong>${companyName}</strong> as a team member.</p>
        <p>Click the button below to complete your registration:</p>
        <a href="${invitationUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Accept Invitation
        </a>
        <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
        <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `;
        const result = await this.sendMail(email, subject, html);
        return { ...result, invitationUrl };
    }
    async sendOrderConfirmation(email, orderId) {
        const subject = `Order Confirmation - ${orderId}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a2e;">Order Confirmed</h1>
        <p>Your order <strong>${orderId}</strong> has been confirmed.</p>
        <p>We'll send you another email when your order ships.</p>
      </div>
    `;
        return this.sendMail(email, subject, html);
    }
    async sendPasswordReset(email, resetUrl) {
        const subject = `Reset Your Password - ${this.fromName}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a2e;">Reset Your Password</h1>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this reset, you can safely ignore this email.</p>
      </div>
    `;
        const result = await this.sendMail(email, subject, html);
        return { ...result, resetUrl };
    }
    async sendVerificationCode(email, code) {
        const subject = `Your Verification Code - ${this.fromName}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a2e;">Verification Code</h1>
        <p>Your verification code is:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
      </div>
    `;
        const result = await this.sendMail(email, subject, html);
        return { ...result, code };
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map