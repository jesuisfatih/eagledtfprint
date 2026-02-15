import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventBusService } from '../event-bus/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * MarketingScheduler — Runs periodic checks for marketing automation events.
 *
 * This handles:
 *  1. Abandoned cart detection (cart inactive > 2 hours)
 *  2. Design abandonment detection (design project inactive > 48 hours)
 *  3. Churn risk alerting (health score drops below threshold)
 */
@Injectable()
export class MarketingScheduler {
  private readonly logger = new Logger(MarketingScheduler.name);

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
  ) {}

  /**
   * Cart abandonment check every 30 minutes.
   * Carts that are still in 'draft' status and haven't been updated for 2+ hours.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkAbandonedCarts() {
    this.logger.debug('Checking for abandoned carts...');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const abandonedCarts = await this.prisma.cart.findMany({
      where: {
        status: 'draft',
        convertedToOrderId: null,
        updatedAt: { lt: twoHoursAgo },
        // Only carts that haven't already been flagged
        NOT: {
          status: 'abandoned',
        },
      },
      include: {
        items: { select: { id: true } },
      },
      take: 100,
    });

    for (const cart of abandonedCarts) {
      const minutesSinceUpdate = Math.floor((Date.now() - cart.updatedAt.getTime()) / (1000 * 60));

      // Mark as abandoned in DB
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { status: 'abandoned' },
      });

      // Emit event to EventBus → Dittofeed
      await this.eventBus.cartAbandoned({
        merchantId: cart.merchantId,
        cartId: cart.id,
        companyUserId: cart.createdByUserId || undefined,
        companyId: cart.companyId || undefined,
        total: Number(cart.total || 0),
        itemCount: cart.items.length,
        abandonedMinutes: minutesSinceUpdate,
      });
    }

    if (abandonedCarts.length > 0) {
      this.logger.log(`Detected ${abandonedCarts.length} abandoned carts`);
    }
  }

  /**
   * Design abandonment check every 2 hours.
   * Design projects that are still in 'draft' and haven't been edited for 48+ hours.
   */
  @Cron(CronExpression.EVERY_2_HOURS)
  async checkAbandonedDesigns() {
    this.logger.debug('Checking for abandoned designs...');

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const abandonedDesigns = await this.prisma.designProject.findMany({
      where: {
        status: 'draft',
        createdAt: { lt: fortyEightHoursAgo },
        lastEditedAt: null, // Never edited, OR...
      },
      take: 50,
    });

    // Also check designs that were started but not completed
    const stalledDesigns = await this.prisma.designProject.findMany({
      where: {
        status: 'in_progress',
        lastEditedAt: { lt: fortyEightHoursAgo },
      },
      take: 50,
    });

    const allAbandoned = [...abandonedDesigns, ...stalledDesigns];

    for (const design of allAbandoned) {
      const hoursInactive = Math.floor(
        (Date.now() - (design.lastEditedAt || design.createdAt).getTime()) / (1000 * 60 * 60)
      );

      // Emit event to EventBus → Dittofeed
      await this.eventBus.designAbandoned({
        merchantId: design.merchantId,
        designProjectId: design.id,
        orderId: design.orderId || undefined,
        companyUserId: design.companyUserId || undefined,
        companyId: design.companyId || undefined,
        hoursInactive,
      });
    }

    if (allAbandoned.length > 0) {
      this.logger.log(`Detected ${allAbandoned.length} abandoned designs`);
    }
  }

  /**
   * Churn risk alerting every 6 hours.
   * Companies with high churn risk → trigger win-back campaigns via Dittofeed.
   */
  @Cron('0 */6 * * *')
  async checkChurnRisks() {
    this.logger.debug('Checking for churn risks...');

    const merchants = await this.prisma.merchant.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    for (const merchant of merchants) {
      const highRiskIntels = await this.prisma.companyIntelligence.findMany({
        where: {
          merchantId: merchant.id,
          churnRisk: { gte: 70 }, // High churn risk threshold
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              users: { select: { id: true }, take: 1 },
            },
          },
        },
      });

      for (const intel of highRiskIntels) {
        if (!intel.company.users[0]) continue;

        await this.eventBus.churnRiskDetected({
          merchantId: merchant.id,
          companyId: intel.company.id,
          companyUserId: intel.company.users[0].id,
          companyName: intel.company.name,
          healthScore: Number(intel.engagementScore || 0),
          churnRisk: Number(intel.churnRisk) >= 85 ? 'critical' : 'high',
          daysSinceLastOrder: intel.daysSinceLastOrder || 0,
        });
      }

      if (highRiskIntels.length > 0) {
        this.logger.log(`Detected ${highRiskIntels.length} high-risk companies for merchant ${merchant.id}`);
      }
    }
  }
}
