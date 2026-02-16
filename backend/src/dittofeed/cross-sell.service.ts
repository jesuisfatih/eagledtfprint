import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cross-sell & Supply Reorder Prediction Engine
 *
 * DTF sektör-spesifik cross-sell stratejileri:
 * 1. By-size → Gang Sheet upgrade teklifi
 * 2. DTF → UV DTF keşfettirme
 * 3. Supply buyer → reorder tahmini
 * 4. Single product → multi-product genişletme
 *
 * Supply Reorder:
 * - DTF Ink ortalama kullanım süresi → tükenme tahmini
 * - DTF Film Roll kullanım oranı → restock zamanlaması
 * - Powder tüketimi → sipariş önerisi
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Supply Consumption Estimates (industry averages)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SUPPLY_CONSUMPTION_RATES: Record<
  string,
  { avgDaysPerUnit: number; reorderLeadDays: number; category: string }
> = {
  // DTF Ink — typically ~30-60 days per set for medium volume
  dtf_ink: { avgDaysPerUnit: 45, reorderLeadDays: 7, category: 'ink' },
  dtf_ink_set: { avgDaysPerUnit: 45, reorderLeadDays: 7, category: 'ink' },

  // DTF Film — ~1 roll per 2-3 weeks for medium volume
  dtf_film: { avgDaysPerUnit: 18, reorderLeadDays: 5, category: 'film' },
  dtf_film_roll: { avgDaysPerUnit: 18, reorderLeadDays: 5, category: 'film' },

  // Transfer Powder — ~30-45 days per bag
  transfer_powder: { avgDaysPerUnit: 35, reorderLeadDays: 5, category: 'powder' },
  dtf_powder: { avgDaysPerUnit: 35, reorderLeadDays: 5, category: 'powder' },

  // Cleaning supplies — ~90 days
  cleaning_solution: { avgDaysPerUnit: 90, reorderLeadDays: 10, category: 'cleaning' },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cross-sell Rules — DTF sektör-spesifik
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CrossSellRule {
  name: string;
  condition: (traits: any) => boolean;
  recommendation: string;
  event: string;
  priority: number; // 1 = highest
}

const CROSS_SELL_RULES: CrossSellRule[] = [
  {
    name: 'by_size_to_gang_sheet',
    condition: (t) =>
      t.favorite_product_type === 'by_size' &&
      t.total_orders >= 3 &&
      !t.gang_sheet_fill_rate,
    recommendation:
      'You could save up to 40% by switching to Gang Sheets! Upload multiple designs on one sheet.',
    event: 'cross_sell_gang_sheet',
    priority: 1,
  },
  {
    name: 'dtf_to_uv_dtf',
    condition: (t) =>
      t.preferred_transfer_type === 'dtf' &&
      t.total_orders >= 5 &&
      !t.has_ordered_uv_dtf,
    recommendation:
      'Try our UV DTF Stickers! Perfect for hard surfaces — cups, phone cases, tumblers.',
    event: 'cross_sell_uv_dtf',
    priority: 2,
  },
  {
    name: 'standard_to_specialty',
    condition: (t) =>
      t.preferred_transfer_type === 'dtf' &&
      t.total_orders >= 8 &&
      !t.has_ordered_glitter &&
      !t.has_ordered_glow,
    recommendation:
      'Make your designs POP! Try our Glitter DTF or Glow-in-the-Dark transfers.',
    event: 'cross_sell_specialty',
    priority: 3,
  },
  {
    name: 'volume_discount_nudge',
    condition: (t) =>
      t.total_orders >= 10 &&
      t.avg_order_value < 100 &&
      !t.is_wholesale,
    recommendation:
      'You qualify for wholesale pricing! Apply now and save 15-25% on every order.',
    event: 'cross_sell_wholesale',
    priority: 2,
  },
  {
    name: 'supply_bundle',
    condition: (t) =>
      t.is_supply_buyer &&
      t.supply_types?.length === 1,
    recommendation:
      'Bundle and save! Get 10% off when you order Ink + Film + Powder together.',
    event: 'cross_sell_supply_bundle',
    priority: 4,
  },
  {
    name: 'transfer_to_supply',
    condition: (t) =>
      t.total_orders >= 20 &&
      t.total_spent > 2000 &&
      !t.is_supply_buyer,
    recommendation:
      'Ready to print in-house? We carry DTF printers, ink, film, and all the supplies you need.',
    event: 'cross_sell_supplies',
    priority: 5,
  },
];

@Injectable()
export class CrossSellService {
  private readonly logger = new Logger(CrossSellService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dittofeedService: DittofeedService,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUPPLY REORDER PREDICTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Supply satın alan müşteriler için reorder tahmini yapar.
   * Tahmini tükenme tarihine göre Dittofeed'e event gönderir.
   *
   * CRON: Her gün öğlen
   */
  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async checkSupplyReorders() {
    try {
      const merchants = await this.prisma.merchant.findMany({
        where: { status: 'active' },
        select: { id: true, shopDomain: true },
      });

      for (const merchant of merchants) {
        await this.checkMerchantSupplyReorders(merchant.id);
      }
    } catch (err: any) {
      this.logger.error(`Supply reorder check failed: ${err.message}`);
    }
  }

  async checkMerchantSupplyReorders(merchantId: string) {
    // Supply satın almış müşterileri bul
    const supplyOrders = await this.prisma.orderLocal.findMany({
      where: {
        merchantId,
        financialStatus: 'paid',
      },
      select: {
        id: true,
        shopifyCustomerId: true,
        companyUserId: true,
        email: true,
        lineItems: true,
        processedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Müşteri bazlı supply satın alma geçmişi oluştur
    const customerSupplyHistory = new Map<
      string,
      {
        email: string;
        userId: string;
        purchases: { category: string; purchasedAt: Date; productTitle: string }[];
      }
    >();

    for (const order of supplyOrders) {
      const userId = order.companyUserId;
      if (!userId || !order.email) continue;

      const lineItems = (order.lineItems as any[]) || [];

      for (const item of lineItems) {
        const supplyCategory = this.detectSupplyCategory(item);
        if (!supplyCategory) continue;

        if (!customerSupplyHistory.has(userId)) {
          customerSupplyHistory.set(userId, {
            email: order.email,
            userId,
            purchases: [],
          });
        }

        customerSupplyHistory.get(userId)!.purchases.push({
          category: supplyCategory,
          purchasedAt: order.processedAt || order.createdAt,
          productTitle: item.title || '',
        });
      }
    }

    // Her müşterinin supply tükenme tarihini tahmin et
    let alertsSent = 0;

    for (const [userId, history] of customerSupplyHistory) {
      // Kategorilere göre grupla
      const byCategory = new Map<string, Date[]>();
      for (const p of history.purchases) {
        if (!byCategory.has(p.category)) {
          byCategory.set(p.category, []);
        }
        byCategory.get(p.category)!.push(p.purchasedAt);
      }

      for (const [category, dates] of byCategory) {
        const sortedDates = dates.sort((a, b) => b.getTime() - a.getTime());
        const lastPurchase = sortedDates[0];

        // Müşteriye özel ortalama sipariş aralığı veya industri ortalaması
        let avgDays: number;
        if (sortedDates.length >= 2) {
          // Müşterinin kendi kullanım oranını hesapla
          const intervals: number[] = [];
          for (let i = 0; i < sortedDates.length - 1; i++) {
            const diff = (sortedDates[i].getTime() - sortedDates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
            intervals.push(diff);
          }
          avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        } else {
          // İlk satın alma — industri ortalamasını kullan
          const rate = this.getConsumptionRate(category);
          avgDays = rate?.avgDaysPerUnit || 30;
        }

        const daysSinceLastPurchase = (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
        const daysUntilEmpty = avgDays - daysSinceLastPurchase;
        const rate = this.getConsumptionRate(category);
        const leadDays = rate?.reorderLeadDays || 7;

        // Tükenme yaklaşıyorsa → event gönder
        if (daysUntilEmpty <= leadDays && daysUntilEmpty > -7) {
          try {
            await this.dittofeedService.trackEvent(userId, 'supply_running_low', {
              category,
              daysUntilEmpty: Math.max(0, Math.round(daysUntilEmpty)),
              lastPurchaseDate: lastPurchase.toISOString(),
              estimatedEmptyDate: new Date(
                lastPurchase.getTime() + avgDays * 24 * 60 * 60 * 1000,
              ).toISOString(),
              avgReorderDays: Math.round(avgDays),
            });

            // Ayrıca trait olarak da güncelle
            await this.dittofeedService.identifyUser(userId, {
              estimated_supply_reorder_date: new Date(
                Date.now() + Math.max(0, daysUntilEmpty) * 24 * 60 * 60 * 1000,
              ).toISOString(),
              is_supply_buyer: true,
            });

            alertsSent++;
          } catch (err: any) {
            this.logger.warn(`Supply alert failed for ${userId}: ${err.message}`);
          }
        }
      }
    }

    if (alertsSent > 0) {
      this.logger.log(`Supply reorder alerts sent: ${alertsSent} for merchant ${merchantId}`);
    }

    return { alertsSent };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CROSS-SELL ANALYSIS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Müşterinin mevcut trait'lerine göre cross-sell önerileri belirler
   * ve Dittofeed'e event olarak gönderir.
   *
   * CRON: Haftada bir
   */
  @Cron(CronExpression.EVERY_WEEK)
  async runCrossSellAnalysis() {
    try {
      const merchants = await this.prisma.merchant.findMany({
        where: { status: 'active' },
        select: { id: true },
      });

      for (const merchant of merchants) {
        await this.analyzeMerchantCrossSell(merchant.id);
      }
    } catch (err: any) {
      this.logger.error(`Cross-sell analysis failed: ${err.message}`);
    }
  }

  async analyzeMerchantCrossSell(merchantId: string) {
    // Marketing sync'ten son trait bilgilerini al
    const syncs = await this.prisma.marketingSync.findMany({
      where: {
        merchantId,
        entityType: 'user',
        syncStatus: 'synced',
        lastTraits: { not: null },
      },
      select: {
        entityId: true,
        dittofeedUserId: true,
        lastTraits: true,
      },
    });

    let eventsSent = 0;

    for (const sync of syncs) {
      const traits = sync.lastTraits as Record<string, any>;
      if (!traits || !sync.dittofeedUserId) continue;

      // Cross-sell kurallarını kontrol et
      const matchedRules = CROSS_SELL_RULES
        .filter((rule) => {
          try {
            return rule.condition(traits);
          } catch {
            return false;
          }
        })
        .sort((a, b) => a.priority - b.priority);

      // En yüksek öncelikli cross-sell önerisini gönder
      if (matchedRules.length > 0) {
        const topRule = matchedRules[0];

        try {
          await this.dittofeedService.trackEvent(sync.dittofeedUserId, topRule.event as any, {
            ruleName: topRule.name,
            recommendation: topRule.recommendation,
            priority: topRule.priority,
            matchedRules: matchedRules.map((r) => r.name),
          });

          // Cross-sell trait güncelle
          await this.dittofeedService.identifyUser(sync.dittofeedUserId, {
            cross_sell_opportunity: topRule.name,
            cross_sell_recommendation: topRule.recommendation,
          });

          eventsSent++;
        } catch (err: any) {
          this.logger.warn(`Cross-sell event failed for ${sync.dittofeedUserId}: ${err.message}`);
        }
      }
    }

    if (eventsSent > 0) {
      this.logger.log(`Cross-sell events sent: ${eventsSent} for merchant ${merchantId}`);
    }

    return { eventsSent };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRODUCT RECOMMENDATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Müşteri bazlı ürün önerileri (real-time API endpoint için)
   */
  async getRecommendationsForUser(userId: string): Promise<
    {
      type: string;
      title: string;
      reason: string;
      discount?: string;
    }[]
  > {
    // Kullanıcının son trait snapshot'ını al
    const sync = await this.prisma.marketingSync.findFirst({
      where: {
        dittofeedUserId: userId,
        entityType: 'user',
      },
      select: { lastTraits: true },
    });

    const traits = (sync?.lastTraits as Record<string, any>) || {};
    const recommendations: { type: string; title: string; reason: string; discount?: string }[] = [];

    // Rule-based recommendations
    for (const rule of CROSS_SELL_RULES) {
      try {
        if (rule.condition(traits)) {
          recommendations.push({
            type: rule.name,
            title: rule.recommendation,
            reason: `Based on your ${traits.total_orders || 0} orders`,
            discount: rule.priority <= 2 ? '10% OFF' : undefined,
          });
        }
      } catch {
        // Skip failed conditions
      }
    }

    // Gang sheet size upgrade önerisi
    if (traits.last_gang_sheet_size && traits.avg_gang_sheet_fill_rate > 0.9) {
      recommendations.push({
        type: 'size_upgrade',
        title: 'Your gang sheets are nearly full! Upgrade to a larger size for better value.',
        reason: `Your average fill rate is ${Math.round((traits.avg_gang_sheet_fill_rate || 0) * 100)}%`,
      });
    }

    return recommendations.sort((a, b) => {
      const ruleA = CROSS_SELL_RULES.find((r) => r.name === a.type);
      const ruleB = CROSS_SELL_RULES.find((r) => r.name === b.type);
      return (ruleA?.priority || 99) - (ruleB?.priority || 99);
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIVATE HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Line item title'dan supply kategorisini tespit eder
   */
  private detectSupplyCategory(lineItem: any): string | null {
    const title = (lineItem.title || '').toLowerCase();

    if (title.includes('ink') || title.includes('mürekkep')) return 'ink';
    if (title.includes('film') || title.includes('roll')) return 'film';
    if (title.includes('powder') || title.includes('toz')) return 'powder';
    if (title.includes('cleaning') || title.includes('temizleme') || title.includes('solution')) return 'cleaning';

    // Product type check
    const productType = (lineItem.product_type || '').toLowerCase();
    if (productType.includes('supply') || productType.includes('supplies')) {
      if (title.includes('ink')) return 'ink';
      if (title.includes('film')) return 'film';
      if (title.includes('powder')) return 'powder';
      return 'other_supply';
    }

    return null; // Not a supply product
  }

  /**
   * Supply kategorisinin tüketim oranını döndürür
   */
  private getConsumptionRate(category: string) {
    // Exact match veya prefix match
    const exactMatch = Object.entries(SUPPLY_CONSUMPTION_RATES).find(
      ([key, val]) => key === category || val.category === category,
    );
    return exactMatch ? exactMatch[1] : null;
  }
}
