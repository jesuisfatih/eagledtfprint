import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * SMS Service — Twilio Integration
 *
 * DTF sektör-spesifik SMS bildirimleri:
 * - Pickup ready / reminder
 * - Supply reorder alerts
 * - Order status updates
 * - Reorder reminders
 *
 * ENV: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

interface SmsPayload {
  to: string;
  body: string;
  merchantId?: string;
}

interface SmsBatchResult {
  sent: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private accountSid: string | undefined;
  private authToken: string | undefined;
  private fromNumber: string | undefined;
  private isConfigured = false;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (this.accountSid && this.authToken && this.fromNumber) {
      this.isConfigured = true;
      this.logger.log('Twilio SMS service configured');
    } else {
      this.logger.warn('Twilio SMS not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER required)');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORE — Send SMS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async sendSms(payload: SmsPayload): Promise<{ success: boolean; sid?: string; error?: string }> {
    if (!this.isConfigured) {
      this.logger.warn('SMS not sent — Twilio not configured');
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

      const res = await axios.post(
        url,
        new URLSearchParams({
          To: payload.to,
          From: this.fromNumber!,
          Body: payload.body,
        }).toString(),
        {
          auth: { username: this.accountSid!, password: this.authToken! },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      this.logger.log(`SMS sent to ${payload.to}: SID ${res.data.sid}`);
      return { success: true, sid: res.data.sid };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      this.logger.error(`SMS failed to ${payload.to}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async sendBatch(payloads: SmsPayload[]): Promise<SmsBatchResult> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    for (const payload of payloads) {
      const result = await this.sendSms(payload);
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${payload.to}: ${result.error}`);
      }
      // Rate limiting — Twilio allows ~1 msg/sec on free tier
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return { sent, failed, errors };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DTF SECTOR-SPECIFIC SMS TEMPLATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Pickup ready — müşteriye sipariş hazır bildirimi */
  async sendPickupReadySms(phone: string, data: { orderNumber: string; shelfCode?: string }) {
    return this.sendSms({
      to: phone,
      body: `✅ Your order #${data.orderNumber} is ready for pickup! ${data.shelfCode ? `Shelf: ${data.shelfCode}. ` : ''}Show this text at our pickup counter. Hours: Mon-Fri 9-6, Sat 10-2.`,
    });
  }

  /** Pickup reminder — 48 saat sonra hala alınmadıysa */
  async sendPickupReminderSms(phone: string, data: { orderNumber: string; daysWaiting: number }) {
    return this.sendSms({
      to: phone,
      body: `📦 Reminder: Order #${data.orderNumber} has been waiting for ${data.daysWaiting} days. Please pick it up within 5 business days. Questions? Reply to this text.`,
    });
  }

  /** Supply reorder — müşterinin supply'ı tükeniyor */
  async sendSupplyReorderSms(phone: string, data: { category: string; daysUntilEmpty: number }) {
    return this.sendSms({
      to: phone,
      body: `⚠️ Your ${data.category} supply is running low (~${data.daysUntilEmpty} days left). Reorder now to avoid downtime. Reply REORDER for a direct link.`,
    });
  }

  /** Order status update */
  async sendOrderStatusSms(phone: string, data: { orderNumber: string; status: string }) {
    const statusMessages: Record<string, string> = {
      PRINTING: '🖨️ printing now',
      READY: '✅ ready for pickup',
      SHIPPED: '📦 shipped! Track it in your email',
      COMPLETED: '🎉 completed. Thank you!',
    };

    const statusText = statusMessages[data.status] || data.status.toLowerCase();

    return this.sendSms({
      to: phone,
      body: `Order #${data.orderNumber} update: ${statusText}`,
    });
  }

  /** Reorder reminder */
  async sendReorderReminderSms(
    phone: string,
    data: { firstName: string; daysSinceLastOrder: number },
  ) {
    return this.sendSms({
      to: phone,
      body: `Hey ${data.firstName}! It's been ${data.daysSinceLastOrder} days since your last order. Need more DTF transfers? Order now and we'll have them ready in 24-48hrs! Reply STOP to opt out.`,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATUS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  getStatus() {
    return {
      configured: this.isConfigured,
      fromNumber: this.fromNumber ? `***${this.fromNumber.slice(-4)}` : null,
    };
  }
}
