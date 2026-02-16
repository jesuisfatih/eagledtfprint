import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dittofeed Event Catalog — Tüm event type'ları
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export type DittofeedEventName =
  // Sipariş Lifecycle
  | 'order_placed'
  | 'order_fulfilled'
  | 'order_cancelled'
  | 'order_refunded'
  | 'order_paid'
  // Gang Sheet Spesifik
  | 'gang_sheet_created'
  | 'gang_sheet_fill_rate_low'
  // Tasarım Lifecycle
  | 'design_uploaded'
  | 'design_approved'
  | 'design_rejected'
  | 'design_waiting_approval'
  | 'design_low_resolution'
  // Üretim Pipeline
  | 'production_started'
  | 'production_completed'
  | 'production_delayed'
  | 'internal_sla_exceeded'
  // Pickup/Shipping
  | 'pickup_ready'
  | 'pickup_completed'
  | 'pickup_reminder'
  | 'shipment_created'
  | 'shipment_delivered'
  // Supply & Stok
  | 'supply_purchased'
  | 'supply_running_low'
  | 'supply_back_in_stock'
  // Fiyatlandırma
  | 'price_tier_upgraded'
  | 'price_tier_downgraded'
  | 'volume_discount_unlocked'
  // Sepet
  | 'cart_created'
  | 'cart_abandoned'
  | 'cart_recovered'
  // Visitor Events (mapped from existing)
  | 'Product Viewed'
  | 'Added to Cart'
  | 'Page Viewed'
  | 'Collection Viewed'
  | 'Order Placed';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dittofeed Traits Interface — Klaviyo Paritesi
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface DittofeedUserTraits {
  // Identity
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;

  // Predictive (Factory Engine hesaplar, trait olarak gönderir)
  predicted_clv?: number;
  churn_risk_score?: number;
  churn_risk_level?: string;
  predicted_next_order_date?: string;
  purchase_probability_30d?: number;
  days_since_last_order?: number;
  avg_order_interval_days?: number;

  // RFM (Factory Engine hesaplar)
  rfm_score?: string;
  rfm_segment?: string;
  rfm_recency?: number;
  rfm_frequency?: number;
  rfm_monetary?: number;

  // CLV Tier
  clv_score?: number;
  clv_tier?: string;

  // Health & Engagement
  health_score?: number;
  purchase_frequency?: string;
  order_trend?: string;
  is_returning?: boolean;

  // DTF Sektör-Spesifik
  favorite_product_type?: string;
  preferred_transfer_type?: string;
  gang_sheet_fill_rate?: number;
  avg_gang_sheet_fill_rate?: number;
  typical_order_size_sqft?: number;
  last_gang_sheet_size?: string;
  design_uploads_count?: number;

  // B2B
  company_id?: string;
  company_name?: string;
  company_tier?: string;
  company_status?: string;
  is_wholesale?: boolean;

  // Pickup/Shipping
  pickup_preferred?: boolean;
  pickup_count?: number;
  ship_count?: number;

  // Supply Buyer
  is_supply_buyer?: boolean;
  supply_types?: string[];
  estimated_supply_reorder_date?: string;

  // Platform
  platform?: string;
  merchant_id?: string;
  merchant_domain?: string;

  // Customer since
  first_order_at?: string;
  last_order_at?: string;
  total_orders?: number;
  total_spent?: number;

  // Free-form
  [key: string]: any;
}

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
    const authHeader = writeKey.includes(':')
      ? `Basic ${Buffer.from(writeKey).toString('base64')}`
      : `Basic ${writeKey}`;

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
      await this.client.get('/api/public/health');
      this.initialized = true;
      this.logger.log(`Dittofeed HTTP client initialized → ${host}`);
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      this.logger.error(`Failed to init Dittofeed HTTP client [${status}]: ${err.message}. Data: ${JSON.stringify(data)}`);
      this.client = createClient();
      this.initialized = true;
      this.logger.warn('Dittofeed initialized with retry mode (health check failed)');
    }
  }

  private isReady(): boolean {
    return this.initialized && this.client !== null;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORE API METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Identify a user with traits */
  async identifyUser(userId: string, traits: Partial<DittofeedUserTraits>) {
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

  /** Track a typed event */
  async trackEvent(userId: string, event: DittofeedEventName | string, properties: Record<string, any> = {}) {
    if (!this.isReady()) return;

    try {
      await this.client!.post('/api/public/apps/track', {
        messageId: randomUUID(),
        timestamp: new Date().toISOString(),
        userId,
        event,
        properties,
      });

      // Log to database for Admin UI visibility
      // Try to find if userId matches a CompanyUser
      let companyUserId: string | null = null;
      let merchantId = properties.merchantId || properties.merchant_id; // Try to extract from props

      // If userId is UUID-like, it might be a companyUserId
      if (userId.length > 20 && !userId.includes('@')) {
         companyUserId = userId;
      }

      // If merchantId is missing, we can't log easily without query,
      // but let's assume we can skip merchantId strict check or leave it empty if schema allows?
      // Schema says merchantId is String (required).

      if (merchantId) {
        await this.prisma.activityLog.create({
          data: {
            merchantId,
            companyUserId, // Might be null if userId is email
            eventType: `dittofeed:${event}`,
            payload: { userId, properties } as any,
            // Try to link to order if present
             // We can't link directly to order relation as ActivityLog structure is loose,
             // but payload will have orderId.
          },
        }).catch(() => {}); // Ignore logging errors to not block flow
      }

    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      this.logger.error(`Failed to track event ${event} for user ${userId}: ${err.message} [${status}] ${JSON.stringify(data)}`);
    }
  }

  /** Track page view */
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

  /** Batch send multiple events */
  async batch(events: Array<{ type: 'identify' | 'track' | 'page'; userId: string; [key: string]: any }>) {
    if (!this.isReady() || events.length === 0) return;

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
      this.logger.error(`Failed to send batch (${events.length} events): ${err.message} [${status}] ${JSON.stringify(data)}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REAL-TIME EVENT TRACKING — Webhook Handler'lardan çağrılır
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Order placed — Shopify webhook → anlık Dittofeed event */
  async trackOrderPlaced(orderData: {
    userId: string;
    orderId: string;
    merchantId: string; // Required for logging
    orderNumber: string;
    totalPrice: number;
    financialStatus: string;
    fulfillmentStatus: string;
    companyId?: string;
    companyName?: string;
    lineItems: any[];
    currency?: string;
    email?: string;
  }) {
    // Ürün kategorilerini analiz et
    const productAnalysis = this.analyzeOrderProducts(orderData.lineItems);

    await this.trackEvent(orderData.userId, 'order_placed', {
      orderId: orderData.orderId,
      merchantId: orderData.merchantId,
      orderNumber: orderData.orderNumber,
      totalPrice: orderData.totalPrice,
      financialStatus: orderData.financialStatus,
      fulfillmentStatus: orderData.fulfillmentStatus || '',
      companyId: orderData.companyId || '',
      companyName: orderData.companyName || '',
      currency: orderData.currency || 'USD',
      lineItemCount: orderData.lineItems.length,
      ...productAnalysis,
    });

    // Identify ile trait güncelle — son sipariş bilgisi
    await this.identifyUser(orderData.userId, {
      email: orderData.email,
      last_order_at: new Date().toISOString(),
      favorite_product_type: productAnalysis.dominantProductType || undefined,
      preferred_transfer_type: productAnalysis.dominantTransferType || undefined,
    });
  }

  /** Order paid event */
  async trackOrderPaid(userId: string, orderId: string, orderNumber: string, totalPrice: number) {
    await this.trackEvent(userId, 'order_paid', {
      orderId,
      orderNumber,
      totalPrice,
    });
  }

  /** Order fulfilled event */
  async trackOrderFulfilled(userId: string, orderId: string, orderNumber: string, merchantId: string, trackingInfo?: {
    trackingNumber?: string;
    trackingUrl?: string;
    carrier?: string;
  }) {
    await this.trackEvent(userId, 'order_fulfilled', {
      orderId,
      merchantId,
      orderNumber,
      ...trackingInfo,
    });
  }

  /** Pickup ready event */
  async trackPickupReady(userId: string, data: {
    orderId: string;
    orderNumber: string;
    qrCode: string;
    shelfCode?: string;
  }) {
    await this.trackEvent(userId, 'pickup_ready', data);
  }

  /** Pickup completed event */
  async trackPickupCompleted(userId: string, data: {
    orderId: string;
    orderNumber: string;
    waitDaysOnShelf: number;
  }) {
    await this.trackEvent(userId, 'pickup_completed', data);
  }

  /** Gang sheet event with fill rate analysis */
  async trackGangSheetEvent(userId: string, data: {
    orderId: string;
    orderNumber: string;
    sheetSize: string;
    fillRate: number;
    itemCount: number;
  }) {
    await this.trackEvent(userId, 'gang_sheet_created', data);

    // Gang sheet fill rate çok düşükse eğitim fırsatı
    if (data.fillRate < 0.7) {
      await this.trackEvent(userId, 'gang_sheet_fill_rate_low', {
        ...data,
        optimizationTip: 'Consider adding more designs to fill your gang sheet and save costs!',
      });
    }
  }

  /** Design event tracking (enhanced) */
  async trackDesignEvent(userId: string, event: DittofeedEventName | string, designData: {
    orderId?: string | null;
    orderNumber?: string | null;
    designProjectId?: string;
    fileName?: string;
    fileCount?: number;
    dimensions?: { width: number; height: number; unit: string };
    variantTitle?: string;
    status?: string;
    format?: string;
    dpi?: number;
  }) {
    await this.trackEvent(userId, event, {
      category: 'design',
      ...designData,
    });

    // DPI düşükse uyarı event'i
    if (designData.dpi && designData.dpi < 300) {
      await this.trackEvent(userId, 'design_low_resolution', {
        designProjectId: designData.designProjectId,
        orderId: designData.orderId,
        dpi: designData.dpi,
        recommendation: 'For best print quality, use 300 DPI or higher.',
      });
    }
  }

  /** Price tier change */
  async trackPriceTierChange(userId: string, data: {
    previousTier: string;
    newTier: string;
    reason: string;
  }) {
    const event = this.tierRank(data.newTier) > this.tierRank(data.previousTier)
      ? 'price_tier_upgraded'
      : 'price_tier_downgraded';

    await this.trackEvent(userId, event, data);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BATCH SYNC METHODS — CRON'dan çağrılır
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** B2B company users sync — enhanced with all traits */
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
      company_id: user.companyId,
      company_name: user.companyName || '',
      company_status: user.companyStatus || 'active',
      merchant_id: user.merchantId || '',
      merchant_domain: user.merchantDomain || '',
      platform: 'eagle-engine',
    });
  }

  /** Sync all companies + users for a merchant */
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
            company_id: company.id,
            company_name: company.name,
            company_status: company.status,
            merchant_id: merchantId,
            merchant_domain: merchant?.shopDomain || '',
            platform: 'eagle-engine',
          } satisfies Partial<DittofeedUserTraits>,
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

    this.logger.log(`Synced ${synced} company users to Dittofeed for merchant ${merchantId}`);
    return { synced };
  }

  /** Sync CompanyIntelligence traits → Dittofeed (RFM, CLV, churn at company level) */
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
      // RFM segment'i company intelligence'dan türet
      const segment = intel.segment || 'new';
      const companyTier = this.segmentToTier(segment);

      for (const user of intel.company.users) {
        batchEvents.push({
          type: 'identify',
          userId: user.id,
          traits: {
            // Company Intelligence → Dittofeed traits
            health_score: Math.round(Number(intel.engagementScore) * 10), // 0-100
            rfm_segment: segment,
            company_tier: companyTier,
            total_orders: intel.totalOrders,
            total_spent: Number(intel.totalRevenue),
            churn_risk_score: Math.round(Number(intel.churnRisk) * 100),
            churn_risk_level: this.churnRiskLevel(Number(intel.churnRisk)),
            days_since_last_order: intel.daysSinceLastOrder || 0,
            avg_order_interval_days: intel.orderFrequencyDays || 0,
            predicted_next_order_date: this.predictNextOrderDate(
              intel.lastOrderAt,
              intel.orderFrequencyDays,
            ),
            purchase_probability_30d: this.purchaseProbability30d(
              intel.daysSinceLastOrder,
              intel.orderFrequencyDays,
            ),
            is_wholesale: intel.totalOrders >= 5 || Number(intel.totalRevenue) >= 500,
          } satisfies Partial<DittofeedUserTraits>,
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

  /** Sync recent orders as events */
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
      const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
      const productAnalysis = this.analyzeOrderProducts(lineItems);

      batchEvents.push({
        type: 'track',
        userId,
        event: 'order_placed',
        properties: {
          orderId: order.id,
          orderNumber: order.shopifyOrderNumber || '',
          totalPrice: Number(order.totalPrice || 0),
          financialStatus: order.financialStatus || '',
          fulfillmentStatus: order.fulfillmentStatus || '',
          companyId: order.companyId || '',
          companyName: order.company.name || '',
          lineItemCount: lineItems.length,
          ...productAnalysis,
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

  /** Sync visitor events */
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

    const eventMap: Record<string, DittofeedEventName> = {
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

  /** Push CustomerInsight (CLV/RFM/Health) data — Klaviyo parity */
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

      const insight = customer.insight;

      batchEvents.push({
        type: 'identify',
        userId: `shopify_${customer.shopifyCustomerId}`,
        traits: {
          email: customer.email,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          phone: customer.phone || '',

          // CLV (Klaviyo Parity)
          clv_score: Number(insight.clvScore || 0),
          clv_tier: insight.clvTier || 'unknown',
          predicted_clv: Number(insight.projectedClv || insight.clvScore || 0),

          // RFM (Klaviyo Parity)
          rfm_recency: insight.rfmRecency || 0,
          rfm_frequency: insight.rfmFrequency || 0,
          rfm_monetary: insight.rfmMonetary || 0,
          rfm_score: `${insight.rfmRecency || 0}-${insight.rfmFrequency || 0}-${insight.rfmMonetary || 0}`,
          rfm_segment: insight.rfmSegment || 'unknown',

          // Health & Churn (Klaviyo Parity)
          health_score: insight.healthScore || 0,
          churn_risk_level: insight.churnRisk || 'unknown',
          churn_risk_score: this.churnRiskToScore(insight.churnRisk),
          purchase_frequency: insight.purchaseFrequency || 'unknown',
          order_trend: insight.orderTrend || 'unknown',
          is_returning: insight.isReturning,

          // Timing
          days_since_last_order: insight.daysSinceLastOrder || 0,
          avg_order_interval_days: insight.avgDaysBetweenOrders || 0,
          predicted_next_order_date: this.predictNextOrderDate(
            insight.lastOrderAt,
            insight.avgDaysBetweenOrders,
          ),
          purchase_probability_30d: this.purchaseProbability30d(
            insight.daysSinceLastOrder,
            insight.avgDaysBetweenOrders,
          ),

          // Milestones
          first_order_at: insight.firstOrderAt?.toISOString() || '',
          last_order_at: insight.lastOrderAt?.toISOString() || '',

          // Totals
          total_spent: Number(customer.totalSpent || 0),
          total_orders: customer.ordersCount,
          merchant_id: merchantId,
        } satisfies Partial<DittofeedUserTraits>,
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

  /** Sync DTF-specific product analysis traits per customer */
  async syncDtfProductTraits(merchantId: string) {
    if (!this.isReady()) return { synced: 0 };

    const orders = await this.prisma.orderLocal.findMany({
      where: { merchantId, companyId: { not: null } },
      include: { company: { include: { users: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Group orders by companyUser
    const userOrders = new Map<string, any[]>();
    for (const order of orders) {
      if (!order.company?.users?.length) continue;
      const userId = order.company.users[0].id;
      if (!userOrders.has(userId)) userOrders.set(userId, []);
      userOrders.get(userId)!.push(order);
    }

    let synced = 0;
    const batchEvents: any[] = [];

    for (const [userId, userOrderList] of userOrders) {
      const analysis = this.analyzeCustomerOrderHistory(userOrderList);

      batchEvents.push({
        type: 'identify',
        userId,
        traits: {
          favorite_product_type: analysis.favoriteProductType,
          preferred_transfer_type: analysis.preferredTransferType,
          gang_sheet_fill_rate: analysis.lastGangSheetFillRate,
          avg_gang_sheet_fill_rate: analysis.avgGangSheetFillRate,
          typical_order_size_sqft: analysis.typicalOrderSizeSqft,
          last_gang_sheet_size: analysis.lastGangSheetSize,
          design_uploads_count: analysis.designUploadsCount,
          is_supply_buyer: analysis.isSupplyBuyer,
          supply_types: analysis.supplyTypes,
        } satisfies Partial<DittofeedUserTraits>,
      });
      synced++;

      if (batchEvents.length >= 50) {
        await this.batch(batchEvents.splice(0));
      }
    }

    if (batchEvents.length > 0) {
      await this.batch(batchEvents);
    }

    this.logger.log(`Synced ${synced} DTF product traits to Dittofeed`);
    return { synced };
  }

  /** Sync pickup behavior traits */
  async syncPickupTraits(merchantId: string) {
    if (!this.isReady()) return { synced: 0 };

    const pickupOrders = await this.prisma.pickupOrder.findMany({
      where: { merchantId },
      include: {
        order: { include: { company: { include: { users: true } } } },
      },
    });

    // Group by user
    const userPickups = new Map<string, { pickupCount: number; shipCount: number }>();

    for (const pickup of pickupOrders) {
      if (!pickup.order?.company?.users?.length) continue;
      const userId = pickup.order.company.users[0].id;
      if (!userPickups.has(userId)) {
        userPickups.set(userId, { pickupCount: 0, shipCount: 0 });
      }
      const stats = userPickups.get(userId)!;
      if (pickup.status === 'PICKED_UP') {
        stats.pickupCount++;
      }
    }

    let synced = 0;
    const batchEvents: any[] = [];

    for (const [userId, stats] of userPickups) {
      batchEvents.push({
        type: 'identify',
        userId,
        traits: {
          pickup_count: stats.pickupCount,
          pickup_preferred: stats.pickupCount > stats.shipCount,
        } satisfies Partial<DittofeedUserTraits>,
      });
      synced++;

      if (batchEvents.length >= 50) {
        await this.batch(batchEvents.splice(0));
      }
    }

    if (batchEvents.length > 0) {
      await this.batch(batchEvents);
    }

    this.logger.log(`Synced ${synced} pickup traits to Dittofeed`);
    return { synced };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WEBHOOK CALLBACK (Dittofeed → Factory Engine)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Process webhook callback from Dittofeed journey */
  async handleWebhookCallback(payload: {
    type: string;
    userId: string;
    journeyName?: string;
    data?: Record<string, any>;
  }) {
    this.logger.log(`Dittofeed webhook callback: ${payload.type} for user ${payload.userId}`);

    switch (payload.type) {
      case 'pickup_reminder_sent':
        // Log that a pickup reminder was sent
        await this.logMarketingAction(payload.userId, 'pickup_reminder', payload.data);
        break;

      case 'escalation_needed':
        // A journey flagged that escalation is needed
        await this.logMarketingAction(payload.userId, 'escalation', payload.data);
        break;

      case 'review_request_sent':
        // Log that a review request was sent
        await this.logMarketingAction(payload.userId, 'review_request', payload.data);
        break;

      case 'reorder_reminder_sent':
        // Log that a reorder reminder was sent
        await this.logMarketingAction(payload.userId, 'reorder_reminder', payload.data);
        break;

      default:
        this.logger.warn(`Unknown webhook callback type: ${payload.type}`);
    }

    return { received: true };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRON: Auto-sync every hour
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Cron(CronExpression.EVERY_HOUR)
  async autoSync() {
    if (!this.isReady()) return;
    this.logger.log('Running Dittofeed auto-sync...');

    const merchants = await this.prisma.merchant.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    for (const m of merchants) {
      try {
        await this.syncCompanyIntelligence(m.id);
        await this.syncOrders(m.id, 1);
        await this.syncVisitorEvents(m.id, 1);
        await this.syncCustomerInsights(m.id);
        await this.syncDtfProductTraits(m.id);
        await this.syncPickupTraits(m.id);
      } catch (err: any) {
        this.logger.error(`Auto-sync failed for merchant ${m.id}: ${err.message}`);
      }
    }

    this.logger.log('Dittofeed auto-sync completed');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIVATE HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Analyze line items for DTF product types */
  private analyzeOrderProducts(lineItems: any[]): {
    hasDesignFiles: boolean;
    hasGangSheet: boolean;
    hasUvDtf: boolean;
    hasSupplies: boolean;
    hasGlitter: boolean;
    hasGlowInDark: boolean;
    dominantProductType: string | null;
    dominantTransferType: string | null;
    totalSqft: number;
    gangSheetSize: string | null;
  } {
    let hasDesignFiles = false;
    let hasGangSheet = false;
    let hasUvDtf = false;
    let hasSupplies = false;
    let hasGlitter = false;
    let hasGlowInDark = false;
    let totalSqft = 0;
    let gangSheetSize: string | null = null;

    for (const item of lineItems) {
      const title = ((item.title || '') + ' ' + (item.variant_title || '')).toLowerCase();
      const props = item.properties || [];

      // Check for design files
      if (props.some((p: any) => {
        const name = (p.name || '').toLowerCase();
        return name.includes('preview') || name.includes('upload') || name.includes('file');
      })) {
        hasDesignFiles = true;
      }

      // Product type detection
      if (title.includes('gang sheet') || title.includes('gang-sheet')) {
        hasGangSheet = true;
        // Try to extract size from variant
        const sizeMatch = title.match(/(\d+["']?\s*x\s*\d+["']?)/i);
        if (sizeMatch) gangSheetSize = sizeMatch[1].replace(/['"]/g, '"');
      }
      if (title.includes('uv dtf') || title.includes('uv-dtf')) hasUvDtf = true;
      if (title.includes('glitter')) hasGlitter = true;
      if (title.includes('glow')) hasGlowInDark = true;
      if (title.includes('ink') || title.includes('film') || title.includes('powder') || title.includes('supply') || title.includes('supplies')) {
        hasSupplies = true;
      }

      // Sqft estimation from variant title (e.g. "22 x 24")
      const dimMatch = (item.variant_title || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
      if (dimMatch) {
        const w = parseFloat(dimMatch[1]);
        const h = parseFloat(dimMatch[2]);
        totalSqft += (w * h) / 144; // inches to sqft
      }
    }

    // Dominant type
    let dominantProductType: string | null = null;
    if (hasGangSheet) dominantProductType = 'gang_sheet';
    else if (hasUvDtf) dominantProductType = 'uv_dtf';
    else if (hasGlitter) dominantProductType = 'glitter_dtf';
    else if (hasGlowInDark) dominantProductType = 'glow_dtf';
    else if (hasSupplies) dominantProductType = 'supplies';
    else dominantProductType = 'by_size';

    let dominantTransferType: string | null = null;
    if (hasUvDtf) dominantTransferType = 'uv_dtf';
    else if (hasGlitter) dominantTransferType = 'glitter';
    else if (hasGlowInDark) dominantTransferType = 'glow_in_dark';
    else dominantTransferType = 'dtf';

    return {
      hasDesignFiles,
      hasGangSheet,
      hasUvDtf,
      hasSupplies,
      hasGlitter,
      hasGlowInDark,
      dominantProductType,
      dominantTransferType,
      totalSqft: Math.round(totalSqft * 100) / 100,
      gangSheetSize,
    };
  }

  /** Analyze customer order history for DTF-specific traits */
  private analyzeCustomerOrderHistory(orders: any[]): {
    favoriteProductType: string;
    preferredTransferType: string;
    lastGangSheetFillRate: number;
    avgGangSheetFillRate: number;
    typicalOrderSizeSqft: number;
    lastGangSheetSize: string;
    designUploadsCount: number;
    isSupplyBuyer: boolean;
    supplyTypes: string[];
  } {
    const typeCounts: Record<string, number> = {};
    const transferCounts: Record<string, number> = {};
    const sqftValues: number[] = [];
    let lastGangSheetSize = '';
    let designUploadsCount = 0;
    let isSupplyBuyer = false;
    const supplyTypes = new Set<string>();

    for (const order of orders) {
      const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
      const analysis = this.analyzeOrderProducts(lineItems);

      if (analysis.dominantProductType) {
        typeCounts[analysis.dominantProductType] = (typeCounts[analysis.dominantProductType] || 0) + 1;
      }
      if (analysis.dominantTransferType) {
        transferCounts[analysis.dominantTransferType] = (transferCounts[analysis.dominantTransferType] || 0) + 1;
      }
      if (analysis.totalSqft > 0) sqftValues.push(analysis.totalSqft);
      if (analysis.gangSheetSize) lastGangSheetSize = analysis.gangSheetSize;
      if (analysis.hasDesignFiles) designUploadsCount++;
      if (analysis.hasSupplies) {
        isSupplyBuyer = true;
        for (const item of lineItems) {
          const title = (item.title || '').toLowerCase();
          if (title.includes('ink')) supplyTypes.add('ink');
          if (title.includes('film')) supplyTypes.add('film');
          if (title.includes('powder')) supplyTypes.add('powder');
          if (title.includes('clean')) supplyTypes.add('cleaning');
        }
      }
    }

    const favoriteProductType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    const preferredTransferType = Object.entries(transferCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'dtf';
    const avgSqft = sqftValues.length > 0 ? sqftValues.reduce((a, b) => a + b, 0) / sqftValues.length : 0;

    return {
      favoriteProductType,
      preferredTransferType,
      lastGangSheetFillRate: 0, // Would need actual gang sheet builder data
      avgGangSheetFillRate: 0,
      typicalOrderSizeSqft: Math.round(avgSqft * 100) / 100,
      lastGangSheetSize,
      designUploadsCount,
      isSupplyBuyer,
      supplyTypes: Array.from(supplyTypes),
    };
  }

  /** Predict next order date from avg frequency */
  private predictNextOrderDate(lastOrderAt: Date | null | undefined, avgDays: number | null | undefined): string {
    if (!lastOrderAt || !avgDays || avgDays <= 0) return '';
    const next = new Date(lastOrderAt.getTime() + avgDays * 86400000);
    return next.toISOString().split('T')[0];
  }

  /** Calculate 30-day purchase probability */
  private purchaseProbability30d(daysSinceLast: number | null | undefined, avgDays: number | null | undefined): number {
    if (!daysSinceLast || !avgDays || avgDays <= 0) return 0;
    // Simple exponential decay model
    const ratio = daysSinceLast / avgDays;
    if (ratio < 0.5) return 0.9;
    if (ratio < 1.0) return 0.7;
    if (ratio < 1.5) return 0.4;
    if (ratio < 2.0) return 0.2;
    if (ratio < 3.0) return 0.1;
    return 0.05;
  }

  /** Convert churn risk label to numeric score */
  private churnRiskToScore(risk: string | null | undefined): number {
    switch (risk) {
      case 'low': return 15;
      case 'medium': return 45;
      case 'high': return 75;
      case 'critical': return 95;
      default: return 50;
    }
  }

  /** Convert numeric churn risk to label */
  private churnRiskLevel(risk: number): string {
    if (risk < 0.25) return 'low';
    if (risk < 0.5) return 'medium';
    if (risk < 0.75) return 'high';
    return 'critical';
  }

  /** Map company segment to tier */
  private segmentToTier(segment: string): string {
    switch (segment) {
      case 'loyal': return 'platinum';
      case 'active': return 'gold';
      case 'new': return 'silver';
      case 'at_risk': return 'bronze';
      case 'churned': return 'inactive';
      default: return 'silver';
    }
  }

  /** Tier ranking for comparison */
  private tierRank(tier: string): number {
    const ranks: Record<string, number> = {
      inactive: 0, bronze: 1, silver: 2, gold: 3, platinum: 4,
    };
    return ranks[tier] ?? 0;
  }

  /** Log marketing action to DB */
  private async logMarketingAction(userId: string, action: string, data?: Record<string, any>) {
    try {
      // Find the user's merchant
      const user = await this.prisma.companyUser.findUnique({
        where: { id: userId },
        select: { companyId: true, company: { select: { merchantId: true } } },
      });

      if (user) {
        await this.prisma.marketingSync.upsert({
          where: {
            merchantId_entityType_entityId: {
              merchantId: user.company.merchantId,
              entityType: `dittofeed_${action}`,
              entityId: userId,
            },
          },
          create: {
            merchantId: user.company.merchantId,
            entityType: `dittofeed_${action}`,
            entityId: userId,
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            lastTraits: data || {},
          },
          update: {
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            lastTraits: data || {},
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to log marketing action: ${err.message}`);
    }
  }
}
