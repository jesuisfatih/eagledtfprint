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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let SmsService = SmsService_1 = class SmsService {
    logger = new common_1.Logger(SmsService_1.name);
    accountSid;
    authToken;
    fromNumber;
    isConfigured = false;
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
        if (this.accountSid && this.authToken && this.fromNumber) {
            this.isConfigured = true;
            this.logger.log('Twilio SMS service configured');
        }
        else {
            this.logger.warn('Twilio SMS not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER required)');
        }
    }
    async sendSms(payload) {
        if (!this.isConfigured) {
            this.logger.warn('SMS not sent — Twilio not configured');
            return { success: false, error: 'Twilio not configured' };
        }
        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
            const res = await axios_1.default.post(url, new URLSearchParams({
                To: payload.to,
                From: this.fromNumber,
                Body: payload.body,
            }).toString(), {
                auth: { username: this.accountSid, password: this.authToken },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            this.logger.log(`SMS sent to ${payload.to}: SID ${res.data.sid}`);
            return { success: true, sid: res.data.sid };
        }
        catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            this.logger.error(`SMS failed to ${payload.to}: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    }
    async sendBatch(payloads) {
        const errors = [];
        let sent = 0;
        let failed = 0;
        for (const payload of payloads) {
            const result = await this.sendSms(payload);
            if (result.success) {
                sent++;
            }
            else {
                failed++;
                errors.push(`${payload.to}: ${result.error}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return { sent, failed, errors };
    }
    async sendPickupReadySms(phone, data) {
        return this.sendSms({
            to: phone,
            body: `✅ Your order #${data.orderNumber} is ready for pickup! ${data.shelfCode ? `Shelf: ${data.shelfCode}. ` : ''}Show this text at our pickup counter. Hours: Mon-Fri 9-6, Sat 10-2.`,
        });
    }
    async sendPickupReminderSms(phone, data) {
        return this.sendSms({
            to: phone,
            body: `📦 Reminder: Order #${data.orderNumber} has been waiting for ${data.daysWaiting} days. Please pick it up within 5 business days. Questions? Reply to this text.`,
        });
    }
    async sendSupplyReorderSms(phone, data) {
        return this.sendSms({
            to: phone,
            body: `⚠️ Your ${data.category} supply is running low (~${data.daysUntilEmpty} days left). Reorder now to avoid downtime. Reply REORDER for a direct link.`,
        });
    }
    async sendOrderStatusSms(phone, data) {
        const statusMessages = {
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
    async sendReorderReminderSms(phone, data) {
        return this.sendSms({
            to: phone,
            body: `Hey ${data.firstName}! It's been ${data.daysSinceLastOrder} days since your last order. Need more DTF transfers? Order now and we'll have them ready in 24-48hrs! Reply STOP to opt out.`,
        });
    }
    getStatus() {
        return {
            configured: this.isConfigured,
            fromNumber: this.fromNumber ? `***${this.fromNumber.slice(-4)}` : null,
        };
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SmsService);
//# sourceMappingURL=sms.service.js.map