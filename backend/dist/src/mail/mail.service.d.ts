import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private config;
    private readonly logger;
    private transporter;
    private readonly fromEmail;
    private readonly fromName;
    private readonly isConfigured;
    constructor(config: ConfigService);
    private sendMail;
    sendInvitation(email: string, companyName: string, invitationUrl: string): Promise<{
        invitationUrl: string;
        success: boolean;
        mode: string;
        messageId?: undefined;
    } | {
        invitationUrl: string;
        success: boolean;
        messageId: any;
        mode?: undefined;
    }>;
    sendOrderConfirmation(email: string, orderId: string): Promise<{
        success: boolean;
        mode: string;
        messageId?: undefined;
    } | {
        success: boolean;
        messageId: any;
        mode?: undefined;
    }>;
    sendPasswordReset(email: string, resetUrl: string): Promise<{
        resetUrl: string;
        success: boolean;
        mode: string;
        messageId?: undefined;
    } | {
        resetUrl: string;
        success: boolean;
        messageId: any;
        mode?: undefined;
    }>;
    sendVerificationCode(email: string, code: string): Promise<{
        code: string;
        success: boolean;
        mode: string;
        messageId?: undefined;
    } | {
        code: string;
        success: boolean;
        messageId: any;
        mode?: undefined;
    }>;
}
