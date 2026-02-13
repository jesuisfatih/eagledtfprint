import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookLogService {
  constructor(private prisma: PrismaService) {}

  async logWebhook(type: string, payload: any, status: 'success' | 'failed', error?: string) {
    // Log to activity_log
    const merchant = await this.prisma.merchant.findFirst();
    if (!merchant) return;

    await this.prisma.activityLog.create({
      data: {
        merchantId: merchant.id,
        eventType: `webhook_${type}`,
        payload: payload,
        createdAt: new Date(),
      },
    });
  }
}

