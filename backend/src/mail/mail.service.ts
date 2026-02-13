import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isConfigured: boolean;

  constructor(private config: ConfigService) {
    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpPort = this.config.get<number>('SMTP_PORT');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');
    
    this.fromEmail = this.config.get<string>('MAIL_FROM', 'noreply@eagle-engine.dev');
    this.fromName = this.config.get<string>('MAIL_FROM_NAME', 'Eagle B2B');
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
    } else {
      this.logger.warn('Mail service not configured - emails will be logged only');
    }
  }

  private async sendMail(to: string, subject: string, html: string, text?: string) {
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
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendInvitation(email: string, companyName: string, invitationUrl: string) {
    const subject = `You've been invited to join ${companyName} on Eagle B2B`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a2e;">Welcome to Eagle B2B</h1>
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

  async sendOrderConfirmation(email: string, orderId: string) {
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

  async sendPasswordReset(email: string, resetUrl: string) {
    const subject = 'Reset Your Password - Eagle B2B';
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

  async sendVerificationCode(email: string, code: string) {
    const subject = 'Your Verification Code - Eagle B2B';
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
}




