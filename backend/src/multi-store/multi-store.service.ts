import { Injectable, Logger } from '@nestjs/common';
import { DittofeedAdminService } from '../dittofeed/dittofeed-admin.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Multi-Store Service (Phase 5)
 *
 * Multi-store yönetimi ve cross-store analytics:
 * - Yeni store onboarding (otomatik Dittofeed segment/journey/template setup)
 * - Cross-store analytics (toplam gelir, müşteri, sipariş karşılaştırması)
 * - Production load balancing (hangi store'un iş yükü fazla)
 * - White-label capability (marka bazlı konfigürasyon)
 * - Cross-store customer matching (aynı müşteri birden fazla store'da)
 *
 * Desteklenen store'lar:
 * - eagledtfprint.com (ana store)
 * - fastdtftransfer.com (ikinci store)
 * - Gelecekte eklenecek store'lar
 */

export interface StoreConfig {
  merchantId: string;
  storeName: string;
  domain: string;
  brandColor: string;
  logoUrl?: string;
  defaultFromEmail: string;
  features: {
    pickup: boolean;
    gangSheet: boolean;
    uvDtf: boolean;
    wholesale: boolean;
  };
}

export interface CrossStoreAnalytics {
  stores: Array<{
    merchantId: string;
    storeName: string;
    domain: string;
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    avgOrderValue: number;
    topProduct: string;
    revenueGrowth: number;
  }>;
  combined: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    uniqueCustomers: number; // de-duplicated across stores
    avgOrderValue: number;
  };
  crossStoreCustomers: number; // customers who ordered from multiple stores
}

export interface ProductionLoadBalance {
  stores: Array<{
    merchantId: string;
    storeName: string;
    queuedJobs: number;
    printingJobs: number;
    totalActive: number;
    estimatedHoursToComplete: number;
    printerUtilization: number;
  }>;
  recommendation: string;
}

@Injectable()
export class MultiStoreService {
  private readonly logger = new Logger(MultiStoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dittofeedAdmin: DittofeedAdminService,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STORE ONBOARDING — Yeni store kurulumu
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Yeni store eklendiğinde tüm otomatik kurulumları yapar:
   * 1. Dittofeed segments (13 predefined)
   * 2. Dittofeed journeys (7 predefined)
   * 3. Email templates (7 predefined)
   * 4. Store config kaydı
   */
  async onboardNewStore(config: StoreConfig) {
    this.logger.log(`Onboarding new store: ${config.storeName} (${config.domain})`);

    const results = {
      store: null as any,
      dittofeed: null as any,
    };

    // 1. Store merchant kaydını kontrol et
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: config.merchantId },
    });

    if (!merchant) {
      throw new Error(`Merchant ${config.merchantId} not found`);
    }

    results.store = {
      merchantId: merchant.id,
      storeName: config.storeName,
      domain: config.domain,
    };

    // 2. Dittofeed full setup (segments + journeys + templates)
    try {
      results.dittofeed = await this.dittofeedAdmin.setupFullStore();
    } catch (err: any) {
      this.logger.error(`Dittofeed setup failed for ${config.storeName}: ${err.message}`);
      results.dittofeed = { error: err.message };
    }

    this.logger.log(`Store onboarding complete: ${config.storeName}`);
    return results;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CROSS-STORE ANALYTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Tüm store'ları karşılaştıran analytics */
  async getCrossStoreAnalytics(): Promise<CrossStoreAnalytics> {
    const merchants = await this.prisma.merchant.findMany({
      select: {
        id: true,
        shopName: true,
        myshopifyDomain: true,
      },
    });

    const storeAnalytics = await Promise.all(
      merchants.map(async (merchant) => {
        const [orders, customers, revenue] = await Promise.all([
          this.prisma.orderLocal.count({ where: { merchantId: merchant.id } }),
          this.prisma.shopifyCustomer.count({ where: { merchantId: merchant.id } }),
          this.prisma.orderLocal.aggregate({
            where: { merchantId: merchant.id },
            _sum: { totalPrice: true },
            _avg: { totalPrice: true },
          }),
        ]);

        // Recent 30 vs previous 30 days revenue for growth
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const [recentRevenue, previousRevenue] = await Promise.all([
          this.prisma.orderLocal.aggregate({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: thirtyDaysAgo },
            },
            _sum: { totalPrice: true },
          }),
          this.prisma.orderLocal.aggregate({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            },
            _sum: { totalPrice: true },
          }),
        ]);

        const recentRev = Number(recentRevenue._sum.totalPrice || 0);
        const prevRev = Number(previousRevenue._sum.totalPrice || 0);
        const growth = prevRev > 0
          ? Math.round(((recentRev - prevRev) / prevRev) * 10000) / 100
          : 0;

        return {
          merchantId: merchant.id,
          storeName: merchant.shopName || merchant.myshopifyDomain || 'Unknown',
          domain: merchant.myshopifyDomain || '',
          totalRevenue: Number(revenue._sum.totalPrice || 0),
          totalOrders: orders,
          totalCustomers: customers,
          avgOrderValue: Number(revenue._avg.totalPrice || 0),
          topProduct: 'DTF Transfers', // Could be enriched with actual product data
          revenueGrowth: growth,
        };
      }),
    );

    // Combined metrics
    const totalRevenue = storeAnalytics.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalOrders = storeAnalytics.reduce((sum, s) => sum + s.totalOrders, 0);
    const totalCustomers = storeAnalytics.reduce((sum, s) => sum + s.totalCustomers, 0);

    // Cross-store customer matching (same email across stores)
    const crossStoreCustomers = await this.getCrossStoreCustomerCount();

    return {
      stores: storeAnalytics,
      combined: {
        totalRevenue,
        totalOrders,
        totalCustomers,
        uniqueCustomers: totalCustomers - crossStoreCustomers,
        avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
      },
      crossStoreCustomers,
    };
  }

  /** Birden fazla store'da sipariş veren müşteri sayısı */
  private async getCrossStoreCustomerCount(): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count FROM (
          SELECT email
          FROM shopify_customers
          WHERE email IS NOT NULL
          GROUP BY email
          HAVING COUNT(DISTINCT merchant_id) > 1
        ) multi_store_customers
      `;
      return Number(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRODUCTION LOAD BALANCING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Tüm store'ların üretim yükünü analiz et
   * Hangi store'un printer'ına yönlendirme yapılmalı?
   */
  async getProductionLoadBalance(): Promise<ProductionLoadBalance> {
    const merchants = await this.prisma.merchant.findMany({
      select: {
        id: true,
        shopName: true,
      },
    });

    const storeLoads = await Promise.all(
      merchants.map(async (merchant) => {
        const [queuedJobs, printingJobs, printers] = await Promise.all([
          this.prisma.productionJob.count({
            where: { merchantId: merchant.id, status: 'QUEUED' },
          }),
          this.prisma.productionJob.count({
            where: { merchantId: merchant.id, status: 'PRINTING' },
          }),
          this.prisma.printer.findMany({
            where: { merchantId: merchant.id, status: 'ACTIVE' },
            select: { id: true, totalPrintsAll: true },
          }),
        ]);

        const totalActive = queuedJobs + printingJobs;
        const activePrinters = printers.length;

        // Rough estimate: each job ~30 min, divided by active printers
        const estimatedHours = activePrinters > 0
          ? Math.round((totalActive * 0.5) / activePrinters * 10) / 10
          : totalActive * 0.5;

        // Utilization: active jobs / (printers × 8 jobs/day capacity)
        const dailyCapacity = activePrinters * 8;
        const utilization = dailyCapacity > 0
          ? Math.min(100, Math.round((totalActive / dailyCapacity) * 10000) / 100)
          : 0;

        return {
          merchantId: merchant.id,
          storeName: merchant.shopName || 'Unknown',
          queuedJobs,
          printingJobs,
          totalActive,
          estimatedHoursToComplete: estimatedHours,
          printerUtilization: utilization,
        };
      }),
    );

    // Recommendation
    const leastBusy = storeLoads.reduce(
      (min, s) => (s.printerUtilization < min.printerUtilization ? s : min),
      storeLoads[0],
    );

    const mostBusy = storeLoads.reduce(
      (max, s) => (s.printerUtilization > max.printerUtilization ? s : max),
      storeLoads[0],
    );

    let recommendation = 'Load is balanced across all stores.';
    if (mostBusy && leastBusy && mostBusy.printerUtilization - leastBusy.printerUtilization > 30) {
      recommendation = `Consider routing new jobs from ${mostBusy.storeName} (${mostBusy.printerUtilization}% utilized) to ${leastBusy.storeName} (${leastBusy.printerUtilization}% utilized).`;
    }

    return {
      stores: storeLoads,
      recommendation,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WHITE-LABEL CONFIGURATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Store bazlı marka konfigürasyonu */
  async getStoreConfig(merchantId: string): Promise<StoreConfig | null> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) return null;

    // Default config — can be enriched from settings table
    return {
      merchantId: merchant.id,
      storeName: merchant.shopName || 'DTF Store',
      domain: merchant.myshopifyDomain || '',
      brandColor: '#2563eb', // Default blue — configurable
      defaultFromEmail: `orders@${merchant.myshopifyDomain || 'eagledtfprint.com'}`,
      features: {
        pickup: true,
        gangSheet: true,
        uvDtf: true,
        wholesale: true,
      },
    };
  }

  /** Tüm store'ları listele */
  async listStores() {
    const merchants = await this.prisma.merchant.findMany({
      select: {
        id: true,
        shopName: true,
        myshopifyDomain: true,
        createdAt: true,
        _count: {
          select: {
            ordersLocal: true,
            shopifyCustomers: true,
          },
        },
      },
    });

    return merchants.map((m) => ({
      merchantId: m.id,
      shopName: m.shopName,
      domain: m.myshopifyDomain,
      createdAt: m.createdAt,
      totalOrders: m._count.ordersLocal,
      totalCustomers: m._count.shopifyCustomers,
    }));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CROSS-STORE CUSTOMER INSIGHTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Birden fazla store'da sipariş veren müşterilerin detayları */
  async getCrossStoreCustomers(limit: number = 50) {
    try {
      const results = await this.prisma.$queryRaw<
        Array<{
          email: string;
          store_count: bigint;
          total_orders: bigint;
          total_spent: number;
          stores: string;
        }>
      >`
        SELECT
          sc.email,
          COUNT(DISTINCT sc.merchant_id) AS store_count,
          COUNT(DISTINCT ol.id) AS total_orders,
          COALESCE(SUM(ol.total_price), 0) AS total_spent,
          STRING_AGG(DISTINCT m.shop_name, ', ') AS stores
        FROM shopify_customers sc
        LEFT JOIN order_locals ol ON ol.merchant_id = sc.merchant_id
          AND (ol.email = sc.email OR ol.customer_email = sc.email)
        LEFT JOIN merchants m ON m.id = sc.merchant_id
        WHERE sc.email IS NOT NULL
        GROUP BY sc.email
        HAVING COUNT(DISTINCT sc.merchant_id) > 1
        ORDER BY total_spent DESC
        LIMIT ${limit}
      `;

      return results.map((r) => ({
        email: r.email,
        storeCount: Number(r.store_count),
        totalOrders: Number(r.total_orders),
        totalSpent: Number(r.total_spent),
        stores: r.stores,
      }));
    } catch {
      return [];
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MOBILE APP SUPPORT — Factory floor data API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Fabrika mobil uygulaması için özet veri
   * Tek endpoint ile tüm ihtiyaç duyulan bilgi
   */
  async getMobileFactoryDashboard(merchantId: string) {
    const [
      queuedJobs,
      printingJobs,
      readyJobs,
      completedToday,
      printers,
      pendingPickups,
    ] = await Promise.all([
      this.prisma.productionJob.count({
        where: { merchantId, status: 'QUEUED' },
      }),
      this.prisma.productionJob.count({
        where: { merchantId, status: 'PRINTING' },
      }),
      this.prisma.productionJob.count({
        where: { merchantId, status: 'READY' },
      }),
      this.prisma.productionJob.count({
        where: {
          merchantId,
          status: 'COMPLETED',
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.printer.findMany({
        where: { merchantId },
        select: {
          id: true,
          name: true,
          status: true,
          inkCyan: true,
          inkMagenta: true,
          inkYellow: true,
          inkBlack: true,
          inkWhite: true,
        },
      }),
      this.prisma.pickupOrder.count({
        where: { merchantId, status: { in: ['READY', 'ON_SHELF', 'ready', 'on_shelf'] } },
      }),
    ]);

    return {
      queue: {
        queued: queuedJobs,
        printing: printingJobs,
        ready: readyJobs,
        completedToday,
      },
      printers: printers.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        inkLevels: {
          cyan: p.inkCyan,
          magenta: p.inkMagenta,
          yellow: p.inkYellow,
          black: p.inkBlack,
          white: p.inkWhite,
        },
        lowInk: [p.inkCyan, p.inkMagenta, p.inkYellow, p.inkBlack, p.inkWhite]
          .some((level) => (level ?? 100) < 20),
      })),
      pickup: {
        pending: pendingPickups,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
