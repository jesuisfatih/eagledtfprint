import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DittofeedService implements OnModuleInit {
  private readonly logger = new Logger(DittofeedService.name);
  private client: AxiosInstance | null = null;
  private initialized = false;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const writeKey = process.env.DITTOFEED_WRITE_KEY;
    const host = process.env.DITTOFEED_HOST || 'http://multiservice-dittofeed:3000';

    if (!writeKey) {
      this.logger.warn('DITTOFEED_WRITE_KEY not set — Dittofeed integration disabled');
      return;
    }

    // Dittofeed's Segment-compatible API uses Basic auth
    // writeKey format: "writeKeyId:writeKeySecret" base64-encoded
    const authHeader = writeKey.includes(':')
      ? `Basic ${Buffer.from(writeKey).toString('base64')}`
      : `Basic ${writeKey}`; // already base64-encoded from dashboard

    const createClient = () =>
      axios.create({
        baseURL: host,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

    try {
      this.client = createClient();

      // Test connectivity
      await this.client.get('/api/public/health');
      this.initialized = true;
      this.logger.log(`Dittofeed HTTP client initialized → ${host}`);
    } catch (err) {
      this.logger.error('Failed to init Dittofeed HTTP client', err);
      // Still mark as initialized — we'll retry on each call
      this.client = createClient();
      this.initialized = true;
      this.logger.warn('Dittofeed initialized with retry mode (health check failed)');
    }
  }

  private isReady(): boolean {
    return this.initialized && this.client !== null;
  }

  // ─── IDENTIFY: Sync a user to Dittofeed via HTTP API ───
  async identifyUser(userId: string, traits: Record<string, any>) {
    if (!this.isReady()) return;

    try {
      await this.client!.post('/api/public/apps/identify', {
        messageId: randomUUID(),
        timestamp: new Date().toISOString(),
        userId,
        traits,
      });
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      this.logger.error(`Failed to identify user ${userId}: ${err.message} [${status}] ${JSON.stringify(data)}`);
    }
  }

  // ─── TRACK: Send event via HTTP API ───
  async trackEvent(userId: string, event: string, properties: Record<string, any> = {}) {
    if (!this.isReady()) return;

    try {
      await this.client!.post('/api/public/apps/track', {
        messageId: randomUUID(),
        timestamp: new Date().toISOString(),
        userId,
        event,
        properties,
      });
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      this.logger.error(`Failed to track event ${event} for user ${userId}: ${err.message} [${status}] ${JSON.stringify(data)}`);
    }
  }

  // ─── PAGE: Track page view via HTTP API ───
  async trackPage(userId: string, pageName: string, properties: Record<string, any> = {}) {
    if (!this.isReady()) return;

    try {
      await this.client!.post('/api/public/apps/page', {
        userId,
        name: pageName,
        properties,
      });
    } catch (err: any) {
      this.logger.error(`Failed to track page ${pageName}: ${err.message}`);
    }
  }

  // ─── BATCH: Send multiple events at once ───
  async batch(events: Array<{ type: 'identify' | 'track' | 'page'; userId: string; [key: string]: any }>) {
    if (!this.isReady()) return;

    try {
      await this.client!.post('/api/public/apps/batch', {
        batch: events.map(e => ({
          messageId: randomUUID(),
          timestamp: new Date().toISOString(),
          ...e,
        })),
      });
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      this.logger.error(`Failed to send batch: ${err.message} [${status}] ${JSON.stringify(data)}`);
    }
  }

  // ─── IDENTIFY COMPANY USER: Sync a company user with all traits ───
  async identifyCompanyUser(user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    companyId: string;
    companyName?: string;
    companyStatus?: string;
    merchantId?: string;
    merchantDomain?: string;
  }) {
    await this.identifyUser(user.id, {
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'member',
      companyId: user.companyId,
      companyName: user.companyName || '',
      companyStatus: user.companyStatus || 'active',
      merchantId: user.merchantId || '',
      merchantDomain: user.merchantDomain || '',
      platform: 'eagle-engine',
    });
  }

  // ─── FULL SYNC: Sync all companies + users for a merchant ───
  async syncAllCompanies(merchantId: string) {
    if (!this.isReady()) return { synced: 0 };

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { shopDomain: true },
    });

    const companies = await this.prisma.company.findMany({
      where: { merchantId },
      include: { users: true },
    });

    let synced = 0;
    const batchEvents: any[] = [];

    for (const company of companies) {
      for (const user of company.users) {
        batchEvents.push({
          type: 'identify',
          userId: user.id,
          traits: {
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: user.role,
            companyId: company.id,
            companyName: company.name,
            companyStatus: company.status,
            merchantId,
            merchantDomain: merchant?.shopDomain || '',
            platform: 'eagle-engine',
          },
        });
        synced++;

        // Flush in batches of 50
        if (batchEvents.length >= 50) {
          await this.batch(batchEvents.splice(0));
        }
      }
    }

    if (batchEvents.length > 0) {
      await this.batch(batchEvents);
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
    const batchEvents: any[] = [];

    for (const intel of intels) {
      for (const user of intel.company.users) {
        batchEvents.push({
          type: 'identify',
          userId: user.id,
          traits: {
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

        if (batchEvents.length >= 50) {
          await this.batch(batchEvents.splice(0));
        }
      }
    }

    if (batchEvents.length > 0) {
      await this.batch(batchEvents);
    }

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
    const batchEvents: any[] = [];

    for (const order of orders) {
      if (!order.company?.users?.length) continue;

      const userId = order.company.users[0].id;

      // Check for design files in line items
      const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
      const hasDesignFiles = lineItems.some((item: any) => {
        const props = item.properties || [];
        return props.some((p: any) => {
          const name = (p.name || '').toLowerCase();
          return name.includes('preview') || name.includes('upload') || name.includes('file');
        });
      });

      batchEvents.push({
        type: 'track',
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
          hasDesignFiles,
          lineItemCount: lineItems.length,
        },
      });
      synced++;

      if (batchEvents.length >= 50) {
        await this.batch(batchEvents.splice(0));
      }
    }

    if (batchEvents.length > 0) {
      await this.batch(batchEvents);
    }

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
    const batchEvents: any[] = [];

    const eventMap: Record<string, string> = {
      product_view: 'Product Viewed',
      add_to_cart: 'Added to Cart',
      page_view: 'Page Viewed',
      collection_view: 'Collection Viewed',
    };

    for (const event of events) {
      const userId = event.companyUserId;
      if (!userId) continue;

      batchEvents.push({
        type: 'track',
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

      if (batchEvents.length >= 50) {
        await this.batch(batchEvents.splice(0));
      }
    }

    if (batchEvents.length > 0) {
      await this.batch(batchEvents);
    }

    this.logger.log(`Synced ${synced} visitor events to Dittofeed`);
    return { synced };
  }

  // ─── SYNC: Push CustomerInsight (CLV/RFM) data ───
  async syncCustomerInsights(merchantId: string) {
    if (!this.isReady()) return { synced: 0 };

    const customers = await this.prisma.shopifyCustomer.findMany({
      where: { merchantId },
      include: { insight: true },
    });

    let synced = 0;
    const batchEvents: any[] = [];

    for (const customer of customers) {
      if (!customer.email || !customer.insight) continue;

      batchEvents.push({
        type: 'identify',
        userId: `shopify_${customer.shopifyCustomerId}`,
        traits: {
          email: customer.email,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          clvTier: customer.insight.clvTier || 'unknown',
          clvScore: Number(customer.insight.clvScore || 0),
          rfmSegment: customer.insight.rfmSegment || 'unknown',
          healthScore: customer.insight.healthScore || 0,
          churnRisk: customer.insight.churnRisk || 'unknown',
          purchaseFrequency: customer.insight.purchaseFrequency || 'unknown',
          orderTrend: customer.insight.orderTrend || 'unknown',
          daysSinceLastOrder: customer.insight.daysSinceLastOrder || 0,
          isReturning: customer.insight.isReturning,
          totalSpent: Number(customer.totalSpent || 0),
          ordersCount: customer.ordersCount,
          merchantId,
        },
      });
      synced++;

      if (batchEvents.length >= 50) {
        await this.batch(batchEvents.splice(0));
      }
    }

    if (batchEvents.length > 0) {
      await this.batch(batchEvents);
    }

    this.logger.log(`Synced ${synced} customer insights to Dittofeed`);
    return { synced };
  }

  // ─── DESIGN EVENT: Track design-related activities ───
  async trackDesignEvent(userId: string, event: string, designData: {
    orderId?: string | null;
    orderNumber?: string | null;
    designProjectId?: string;
    fileName?: string;
    fileCount?: number;
    dimensions?: { width: number; height: number; unit: string };
    variantTitle?: string;
    status?: string;
    format?: string;
  }) {
    await this.trackEvent(userId, event, {
      category: 'design',
      ...designData,
    });
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
      await this.syncCustomerInsights(m.id);
    }
  }
}
