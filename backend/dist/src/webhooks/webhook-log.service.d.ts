import { PrismaService } from '../prisma/prisma.service';
export declare class WebhookLogService {
    private prisma;
    constructor(prisma: PrismaService);
    logWebhook(type: string, payload: any, status: 'success' | 'failed', error?: string): Promise<void>;
}
