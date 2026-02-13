import { DittofeedSdk } from '@dittofeed/sdk-node';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DittofeedService implements OnModuleInit {
  private readonly logger = new Logger(DittofeedService.name);
  private initialized = false;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const writeKey = process.env.DITTOFEED_WRITE_KEY;
    const host = process.env.DITTOFEED_HOST || 'http://localhost:3010';

    if (!writeKey) {
      this.logger.warn('DITTOFEED_WRITE_KEY not set — Dittofeed integration disabled');
      return;
    }

    try {
      await DittofeedSdk.init({ writeKey, host });
      this.initialized = true;
      this.logger.log('Dittofeed SDK initialized');
    } catch (err) {
      this.logger.error('Failed to init Dittofeed SDK', err);
    }
  }

  private isReady(): boolean {
    return this.initialized;
  }

  // ─── IDENTIFY: Sync a company user to Dittofeed ───
  async identifyCompanyUser(user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    companyId: string;
    companyName?: string;
    companyStatus?: string;
  }) {
    if (!this.isReady()) return;

    try {
      DittofeedSdk.identify({
        userId: user.id,
        traits: {
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role || 'member',
          companyId: user.companyId,
          companyName: user.companyName || '',
          companyStatus: user.companyStatus || 'active',
          platform: 'eagle-engine',
        },
      });
      await DittofeedSdk.flush();
    } catch (err) {
      this.logger.error(`Failed to identify user ${user.id}`, err);
    }
  }

  // ─── TRACK: Send event to Dittofeed ───
  async trackEvent(userId: string, event: string, properties: Record<string, any> = {}) {
    if (!this.isReady()) return;

    try {
      DittofeedSdk.track({
        userId,
        event,
        properties,
      });
      await DittofeedSdk.flush();
    } catch (err) {
      this.logger.error(`Failed to track event ${event} for user ${userId}`, err);
    }
  }

  // ─── PAGE: Track page view ───
  async trackPage(userId: string, pageName: string, properties: Record<string, any> = {}) {
    if (!this.isReady()) return;

    try {
      DittofeedSdk.page({
        userId,
        name: pageName,
        properties,
      });
    } catch (err) {
      this.logger.error(`Failed to track page ${pageName}`, err);
    }
  }

  // ─── FULL SYNC: Sync all companies + users for a merchant ───
  async syncAllCompanies(merchantId: string) {
    if (!this.isReady()) return { synced: 0 };

    const companies = await this.prisma.company.findMany({
      where: { merchantId },
      include: { users: true },
    });

    let synced = 0;
    for (const company of companies) {
      for (const user of company.users) {
        await this.identifyCompanyUser({
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: user.role,
          companyId: company.id,
          companyName: company.name,
          companyStatus: company.status,
        });
        synced++;
      }
    }

    this.logger.log(`Synced ${synced} company users to Dittofeed for merchant ${merchantId}`);
    return { synced };
  }

  // ─── SYNC: CompanyIntelligence traits → Dittofeed ───
  async syncCompanyIntelligence(merchantId: string) {
    if (!this.isReady()) return { synced: 0 };

    const intels = await this.prisma.companyIntelligence.findMany({
      where: { merchantId },
      include: {
        company: { include: { users: true } },
      },
    });

    let synced = 0;
    for (const intel of intels) {
      // Push intelligence traits to each user of the company
      for (const user of intel.company.users) {
        DittofeedSdk.identify({
          userId: user.id,
          traits: {
            // Company intelligence metrics
            engagementScore: Number(intel.engagementScore),
            buyerIntent: intel.buyerIntent,
            segment: intel.segment,
            totalSessions: intel.totalSessions,
            totalPageViews: intel.totalPageViews,
            totalProductViews: intel.totalProductViews,
            totalAddToCarts: intel.totalAddToCarts,
            totalOrders: intel.totalOrders,
            totalRevenue: Number(intel.totalRevenue),
            avgOrderValue: Number(intel.avgOrderValue),
            churnRisk: Number(intel.churnRisk),
            upsellPotential: Number(intel.upsellPotential),
            daysSinceLastOrder: intel.daysSinceLastOrder || 0,
            lastActiveAt: intel.lastActiveAt?.toISOString() || '',
          },
        });
        synced++;
      }
    }

    await DittofeedSdk.flush();
    this.logger.log(`Synced ${synced} intelligence profiles to Dittofeed for merchant ${merchantId}`);
    return { synced };
  }

  // ─── SYNC: Push order events ───
  async syncOrders(merchantId: string, sinceHours = 24) {
    if (!this.isReady()) return { synced: 0 };

    const since = new Date(Date.now() - sinceHours * 3600 * 1000);
    const orders = await this.prisma.orderLocal.findMany({
      where: { merchantId, createdAt: { gte: since } },
      include: { company: { include: { users: true } } },
    });

    let synced = 0;
    for (const order of orders) {
      if (!order.company?.users?.length) continue;

      const userId = order.company.users[0].id;
      DittofeedSdk.track({
        userId,
        event: 'Order Placed',
        properties: {
          orderId: order.id,
          orderNumber: order.shopifyOrderNumber || '',
          totalPrice: Number(order.totalPrice || 0),
          financialStatus: order.financialStatus || '',
          fulfillmentStatus: order.fulfillmentStatus || '',
          companyId: order.companyId || '',
          companyName: order.company.name || '',
        },
      });
      synced++;
    }

    await DittofeedSdk.flush();
    this.logger.log(`Synced ${synced} order events to Dittofeed`);
    return { synced };
  }

  // ─── SYNC: Push visitor events (product views, add to carts) ───
  async syncVisitorEvents(merchantId: string, sinceHours = 24) {
    if (!this.isReady()) return { synced: 0 };

    const since = new Date(Date.now() - sinceHours * 3600 * 1000);
    const events = await this.prisma.visitorEvent.findMany({
      where: {
        merchantId,
        createdAt: { gte: since },
        eventType: { in: ['product_view', 'add_to_cart', 'page_view', 'collection_view'] },
        companyUserId: { not: null },
      },
      take: 500,
    });

    let synced = 0;
    for (const event of events) {
      const userId = event.companyUserId;
      if (!userId) continue;

      const eventMap: Record<string, string> = {
        product_view: 'Product Viewed',
        add_to_cart: 'Added to Cart',
        page_view: 'Page Viewed',
        collection_view: 'Collection Viewed',
      };

      DittofeedSdk.track({
        userId,
        event: eventMap[event.eventType] || event.eventType,
        properties: {
          ...(event.metadata as Record<string, any> || {}),
          pageUrl: event.pageUrl || '',
          productTitle: event.productTitle || '',
          sessionId: event.sessionId || '',
        },
      });
      synced++;
    }

    await DittofeedSdk.flush();
    this.logger.log(`Synced ${synced} visitor events to Dittofeed`);
    return { synced };
  }

  // ─── CRON: Auto-sync every hour ───
  @Cron(CronExpression.EVERY_HOUR)
  async autoSync() {
    if (!this.isReady()) return;
    this.logger.log('Running Dittofeed auto-sync...');

    const merchants = await this.prisma.merchant.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    for (const m of merchants) {
      await this.syncCompanyIntelligence(m.id);
      await this.syncOrders(m.id, 1);
      await this.syncVisitorEvents(m.id, 1);
    }
  }
}
