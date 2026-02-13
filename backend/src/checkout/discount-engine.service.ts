import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class DiscountEngineService {
  private readonly logger = new Logger(DiscountEngineService.name);

  constructor(private prisma: PrismaService) {}

  async generateDiscountCode(
    merchantId: string,
    companyId: string,
    cartId: string,
    discountAmount: number,
  ): Promise<string> {
    // Generate unique code
    const code = `EAGLE-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // Store in database
    await this.prisma.discountCode.create({
      data: {
        merchantId,
        companyId,
        cartId,
        code,
        discountType: 'fixed_amount',
        value: discountAmount,
        usageLimit: 1,
        isActive: true,
      },
    });

    this.logger.log(`Generated discount code: ${code} for cart ${cartId}`);
    return code;
  }

  async validateDiscountCode(code: string, merchantId: string) {
    const discount = await this.prisma.discountCode.findFirst({
      where: {
        merchantId,
        code,
        isActive: true,
      },
    });

    if (!discount) {
      return null;
    }

    // Check usage limit
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return null;
    }

    // Check validity dates
    const now = new Date();
    if (discount.validFrom && discount.validFrom > now) {
      return null;
    }
    if (discount.validUntil && discount.validUntil < now) {
      return null;
    }

    return discount;
  }

  async markDiscountUsed(code: string) {
    return this.prisma.discountCode.updateMany({
      where: { code },
      data: {
        usedCount: { increment: 1 },
      },
    });
  }
}




