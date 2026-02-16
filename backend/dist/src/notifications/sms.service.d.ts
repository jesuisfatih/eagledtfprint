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
export declare class SmsService {
    private readonly logger;
    private accountSid;
    private authToken;
    private fromNumber;
    private isConfigured;
    constructor();
    sendSms(payload: SmsPayload): Promise<{
        success: boolean;
        sid?: string;
        error?: string;
    }>;
    sendBatch(payloads: SmsPayload[]): Promise<SmsBatchResult>;
    sendPickupReadySms(phone: string, data: {
        orderNumber: string;
        shelfCode?: string;
    }): Promise<{
        success: boolean;
        sid?: string;
        error?: string;
    }>;
    sendPickupReminderSms(phone: string, data: {
        orderNumber: string;
        daysWaiting: number;
    }): Promise<{
        success: boolean;
        sid?: string;
        error?: string;
    }>;
    sendSupplyReorderSms(phone: string, data: {
        category: string;
        daysUntilEmpty: number;
    }): Promise<{
        success: boolean;
        sid?: string;
        error?: string;
    }>;
    sendOrderStatusSms(phone: string, data: {
        orderNumber: string;
        status: string;
    }): Promise<{
        success: boolean;
        sid?: string;
        error?: string;
    }>;
    sendReorderReminderSms(phone: string, data: {
        firstName: string;
        daysSinceLastOrder: number;
    }): Promise<{
        success: boolean;
        sid?: string;
        error?: string;
    }>;
    getStatus(): {
        configured: boolean;
        fromNumber: string | null;
    };
}
export {};
