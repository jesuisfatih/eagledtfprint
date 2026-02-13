import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerIntelligenceService } from './customer-intelligence.service';

/**
 * Proactive Offer Generation Service
 * Uses customer intelligence data to automatically generate
 * personalized offers targeting specific customer segments.
 */

// Strategy configuration: each strategy defines who to target and what to offer
interface OfferStrategy {
  name: string;
  description: string;
  targetSegments: string[];
  targetChurnRisk?: string[];
  targetClvTier?: string[];
  minDaysSinceLastOrder?: number;
  maxDaysSinceLastOrder?: number;
  minOrders?: number;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountRange: { min: number; max: number }; // Value range based on CLV
  validHours: number; // How long the offer is valid
  channel: 'email' | 'sms' | 'in_app';
  maxOffersPerDay: number;
  cooldownDays: number; // Min days between offers for same customer
}

const OFFER_STRATEGIES: Record<string, OfferStrategy> = {
  win_back: {
    name: 'Win-Back Campaign',
    description: 'Re-engage customers who haven\'t ordered recently',
    targetSegments: ['at_risk', 'hibernating', 'about_to_sleep'],
    targetChurnRisk: ['high', 'critical'],
    minDaysSinceLastOrder: 60,
    minOrders: 2,
    discountType: 'percentage',
    discountRange: { min: 15, max: 30 },
    validHours: 72,
    channel: 'email',
    maxOffersPerDay: 10,
    cooldownDays: 30,
  },
  loyalty_reward: {
    name: 'Loyalty Reward',
    description: 'Reward loyal customers with exclusive offers',
    targetSegments: ['champions', 'loyal'],
    targetClvTier: ['platinum', 'gold'],
    minOrders: 5,
    discountType: 'percentage',
    discountRange: { min: 10, max: 20 },
    validHours: 168, // 7 days
    channel: 'email',
    maxOffersPerDay: 5,
    cooldownDays: 45,
  },
  upsell: {
    name: 'Upsell Incentive',
    description: 'Encourage higher-value purchases',
    targetSegments: ['potential_loyalist', 'promising', 'new_customers'],
    targetClvTier: ['silver', 'bronze'],
    minOrders: 1,
    discountType: 'percentage',
    discountRange: { min: 5, max: 15 },
    validHours: 48,
    channel: 'email',
    maxOffersPerDay: 10,
    cooldownDays: 14,
  },
  reactivation: {
    name: 'Customer Reactivation',
    description: 'Bring back lost customers with aggressive offers',
    targetSegments: ['lost', 'cant_lose'],
    targetChurnRisk: ['critical'],
    minDaysSinceLastOrder: 120,
    minOrders: 1,
    discountType: 'percentage',
    discountRange: { min: 25, max: 40 },
    validHours: 120, // 5 days
    channel: 'email',
    maxOffersPerDay: 5,
    cooldownDays: 60,
  },
  volume_incentive: {
    name: 'Volume Incentive',
    description: 'Encourage larger orders with minimum spend discount',
    targetSegments: ['loyal', 'potential_loyalist', 'need_attention'],
    minOrders: 3,
    discountType: 'fixed_amount',
    discountRange: { min: 10, max: 50 },
    validHours: 96, // 4 days
    channel: 'email',
    maxOffersPerDay: 8,
    cooldownDays: 21,
  },
  first_purchase_followup: {
    name: 'First Purchase Follow-up',
    description: 'Encourage second purchase after first order',
    targetSegments: ['new_customers'],
    minOrders: 1,
    maxDaysSinceLastOrder: 30,
    discountType: 'percentage',
    discountRange: { min: 10, max: 15 },
    validHours: 168, // 7 days
    channel: 'email',
    maxOffersPerDay: 15,
    cooldownDays: 14,
  },
  declining_trend: {
    name: 'Declining Trend Intervention',
    description: 'Intervene when order frequency is declining',
    targetSegments: ['need_attention', 'about_to_sleep'],
    targetChurnRisk: ['medium', 'high'],
    minOrders: 3,
    discountType: 'percentage',
    discountRange: { min: 10, max: 20 },
    validHours: 96,
    channel: 'email',
    maxOffersPerDay: 8,
    cooldownDays: 21,
  },
  high_value_retention: {
    name: 'High-Value Retention',
    description: 'Retain highest-spending customers proactively',
    targetClvTier: ['platinum'],
    targetSegments: ['champions', 'loyal', 'cant_lose'],
    minOrders: 5,
    discountType: 'percentage',
    discountRange: { min: 5, max: 15 },
    validHours: 336, // 14 days
    channel: 'email',
    maxOffersPerDay: 3,
    cooldownDays: 60,
  },
  free_shipping_nudge: {
    name: 'Free Shipping Nudge',
    description: 'Offer free shipping to encourage conversion',
    targetSegments: ['promising', 'new_customers', 'potential_loyalist'],
    targetChurnRisk: ['medium'],
    minOrders: 1,
    discountType: 'free_shipping',
    discountRange: { min: 0, max: 0 },
    validHours: 48,
    channel: 'email',
    maxOffersPerDay: 15,
    cooldownDays: 14,
  },
  anniversary: {
    name: 'Customer Anniversary',
    description: 'Celebrate customer relationship milestones',
    targetSegments: ['champions', 'loyal', 'potential_loyalist'],
    minOrders: 2,
    discountType: 'percentage',
    discountRange: { min: 15, max: 25 },
    validHours: 168,
    channel: 'email',
    maxOffersPerDay: 5,
    cooldownDays: 365,
  },
};

@Injectable()
export class ProactiveOfferService {
  private readonly logger = new Logger(ProactiveOfferService.name);

  constructor(
    private prisma: PrismaService,
    private customerIntelligence: CustomerIntelligenceService,
  ) {}

  /**
   * Generate offers for all eligible customers of a merchant
   */
  async generateOffers(merchantId: string): Promise<{
    generated: number;
    strategies: Record<string, number>;
  }> {
    this.logger.log(`Generating proactive offers for merchant: ${merchantId}`);

    const strategies: Record<string, number> = {};
    let totalGenerated = 0;

    // Get all customers with insights
    const customers = await this.prisma.shopifyCustomer.findMany({
      where: { merchantId },
      include: { insight: true } as any,
    });

    for (const [strategyKey, strategy] of Object.entries(OFFER_STRATEGIES)) {
      try {
        const count = await this.processStrategy(
          merchantId,
          strategyKey,
          strategy,
          customers,
        );
        strategies[strategyKey] = count;
        totalGenerated += count;
      } catch (error) {
        this.logger.warn(`Strategy ${strategyKey} failed: ${error.message}`);
        strategies[strategyKey] = 0;
      }
    }

    this.logger.log(`Generated ${totalGenerated} proactive offers.`);
    return { generated: totalGenerated, strategies };
  }

  /**
   * Process a single offer strategy for all eligible customers
   */
  private async processStrategy(
    merchantId: string,
    strategyKey: string,
    strategy: OfferStrategy,
    customers: any[],
  ): Promise<number> {
    let generated = 0;

    // Filter eligible customers
    const eligible = customers.filter((customer) => {
      const insight = customer.insight;
      if (!insight) return false;

      // Check RFM segment match
      if (strategy.targetSegments.length > 0 &&
          !strategy.targetSegments.includes(insight.rfmSegment)) {
        return false;
      }

      // Check churn risk match
      if (strategy.targetChurnRisk?.length &&
          !strategy.targetChurnRisk.includes(insight.churnRisk)) {
        return false;
      }

      // Check CLV tier match
      if (strategy.targetClvTier?.length &&
          !strategy.targetClvTier.includes(insight.clvTier)) {
        return false;
      }

      // Check min orders
      if (strategy.minOrders &&
          (customer.ordersCount || 0) < strategy.minOrders) {
        return false;
      }

      // Check days since last order
      if (strategy.minDaysSinceLastOrder &&
          (insight.daysSinceLastOrder || 0) < strategy.minDaysSinceLastOrder) {
        return false;
      }

      if (strategy.maxDaysSinceLastOrder &&
          (insight.daysSinceLastOrder || 999) > strategy.maxDaysSinceLastOrder) {
        return false;
      }

      return true;
    });

    // Limit by maxOffersPerDay
    const toProcess = eligible.slice(0, strategy.maxOffersPerDay);

    for (const customer of toProcess) {
      try {
        // Check cooldown period
        const recentOffer = await this.prisma.proactiveOffer.findFirst({
          where: {
            shopifyCustomerId: customer.id,
            strategy: strategyKey,
            createdAt: {
              gte: new Date(Date.now() - strategy.cooldownDays * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (recentOffer) continue; // Skip — cooldown hasn't expired

        // Calculate personalized discount value
        const discountValue = this.calculateDiscountValue(
          customer,
          strategy,
        );

        // Generate unique discount code
        const discountCode = this.generateCode(strategyKey);

        // Calculate minimum order amount (for volume incentives)
        const minimumOrderAmount = strategyKey === 'volume_incentive'
          ? this.calculateMinimumOrder(customer)
          : null;

        // Build personalized message
        const message = this.generateMessage(strategyKey, customer, discountValue, strategy.discountType);

        // Create the proactive offer
        await this.prisma.proactiveOffer.create({
          data: {
            merchantId,
            shopifyCustomerId: customer.id,
            strategy: strategyKey,
            triggerReason: strategy.description,
            discountType: strategy.discountType,
            discountValue,
            discountCode,
            minimumOrderAmount,
            title: strategy.name,
            message,
            suggestedProducts: this.getSuggestedProducts(customer),
            channel: strategy.channel,
            status: 'active',
            expiresAt: new Date(Date.now() + strategy.validHours * 60 * 60 * 1000),
          },
        });

        generated++;
      } catch (error) {
        this.logger.warn(
          `Failed to create offer for customer ${customer.id}: ${error.message}`,
        );
      }
    }

    return generated;
  }

  /**
   * Calculate personalized discount value based on CLV and strategy
   */
  private calculateDiscountValue(
    customer: any,
    strategy: OfferStrategy,
  ): number {
    if (strategy.discountType === 'free_shipping') return 0;

    const insight = customer.insight;
    const clvTier = insight?.clvTier || 'bronze';
    const { min, max } = strategy.discountRange;

    // Higher-value customers get better discounts to retain them
    const tierMultiplier: Record<string, number> = {
      platinum: 0.9,
      gold: 0.7,
      silver: 0.4,
      bronze: 0.2,
    };

    const multiplier = tierMultiplier[clvTier] || 0.2;
    const discountValue = Math.round(min + (max - min) * multiplier);

    return discountValue;
  }

  /**
   * Calculate minimum order amount for volume incentives
   */
  private calculateMinimumOrder(customer: any): number {
    const avgOrderValue = Number(customer.insight?.avgOrderValue || 50);
    // Set minimum at 1.5x their average to encourage larger orders
    return Math.round(avgOrderValue * 1.5);
  }

  /**
   * Generate unique discount code
   */
  private generateCode(strategy: string): string {
    const prefix = strategy.toUpperCase().slice(0, 4);
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `EAGLE-${prefix}-${random}`;
  }

  /**
   * Generate personalized message
   */
  private generateMessage(
    strategy: string,
    customer: any,
    discountValue: number,
    discountType: string,
  ): string {
    const firstName = customer.firstName || 'Valued Customer';
    const discountLabel = discountType === 'percentage'
      ? `${discountValue}%`
      : discountType === 'free_shipping'
        ? 'Free Shipping'
        : `$${discountValue}`;

    const messages: Record<string, string> = {
      win_back: `Hi ${firstName}! We miss you! Come back and enjoy ${discountLabel} off your next order. We've got great new products waiting for you.`,
      loyalty_reward: `${firstName}, thank you for being an amazing customer! As a token of our appreciation, here's ${discountLabel} off — enjoy!`,
      upsell: `${firstName}, here's a special offer just for you: ${discountLabel} off your next order. Discover our latest products!`,
      reactivation: `${firstName}, it's been a while! We'd love to welcome you back with ${discountLabel} off. Let's reconnect!`,
      volume_incentive: `${firstName}, unlock ${discountLabel} off with your next big order! The more you shop, the more you save.`,
      first_purchase_followup: `${firstName}, thanks for your first order! Here's ${discountLabel} off to make your next experience even better.`,
      declining_trend: `${firstName}, we noticed it's been a while. Here's ${discountLabel} off to brighten your day!`,
      high_value_retention: `${firstName}, as one of our most valued customers, enjoy an exclusive ${discountLabel} off. You deserve it!`,
      free_shipping_nudge: `${firstName}, enjoy FREE SHIPPING on your next order! No minimum purchase required.`,
      anniversary: `Happy Anniversary, ${firstName}! To celebrate our time together, here's ${discountLabel} off. Thank you for being with us!`,
    };

    return messages[strategy] || `${firstName}, enjoy ${discountLabel} off your next order!`;
  }

  /**
   * Get suggested products based on customer preferences
   */
  private getSuggestedProducts(customer: any): string[] {
    const insight = customer.insight;
    if (!insight) return [];

    // Return preferred categories for now — can be expanded to actual product IDs
    const categories = Array.isArray(insight.preferredCategories)
      ? insight.preferredCategories.slice(0, 3)
      : [];

    return categories;
  }

  // ===================================================
  // QUERY METHODS
  // ===================================================

  /**
   * Get active offers for a specific customer
   */
  async getCustomerOffers(customerId: string) {
    return this.prisma.proactiveOffer.findMany({
      where: {
        shopifyCustomerId: customerId,
        status: 'active',
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all offers for a merchant with analytics
   */
  async getMerchantOffers(merchantId: string, filters?: {
    status?: string;
    strategy?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { merchantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.strategy) where.strategy = filters.strategy;

    const [offers, total] = await Promise.all([
      this.prisma.proactiveOffer.findMany({
        where,
        include: {
          shopifyCustomer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        } as any,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.proactiveOffer.count({ where }),
    ]);

    return { offers, total };
  }

  /**
   * Get offer analytics/summary for a merchant
   */
  async getOfferAnalytics(merchantId: string) {
    const allOffers = await this.prisma.proactiveOffer.findMany({
      where: { merchantId },
    });

    const now = new Date();

    const byStrategy: Record<string, { sent: number; accepted: number; expired: number; revenue: number }> = {};
    let totalSent = 0;
    let totalAccepted = 0;
    let totalExpired = 0;
    let totalRevenue = 0;

    for (const offer of allOffers) {
      if (!byStrategy[offer.strategy]) {
        byStrategy[offer.strategy] = { sent: 0, accepted: 0, expired: 0, revenue: 0 };
      }

      totalSent++;
      byStrategy[offer.strategy].sent++;

      if (offer.status === 'accepted' || offer.redeemedAt) {
        totalAccepted++;
        byStrategy[offer.strategy].accepted++;
      }

      if (offer.status === 'expired' || (offer.expiresAt < now && offer.status === 'active')) {
        totalExpired++;
        byStrategy[offer.strategy].expired++;
      }

      const revenue = Number(offer.resultRevenue || 0);
      totalRevenue += revenue;
      byStrategy[offer.strategy].revenue += revenue;
    }

    return {
      totalSent,
      totalAccepted,
      totalExpired,
      totalRevenue,
      conversionRate: totalSent > 0 ? ((totalAccepted / totalSent) * 100).toFixed(1) : '0',
      avgRevenuePerAccepted: totalAccepted > 0 ? (totalRevenue / totalAccepted).toFixed(2) : '0',
      byStrategy,
      activeOffers: allOffers.filter(o => o.status === 'active' && o.expiresAt > now).length,
    };
  }

  /**
   * Mark an offer as viewed
   */
  async markViewed(offerId: string) {
    return this.prisma.proactiveOffer.update({
      where: { id: offerId },
      data: { viewedAt: new Date() },
    });
  }

  /**
   * Mark an offer as accepted
   */
  async markAccepted(offerId: string) {
    return this.prisma.proactiveOffer.update({
      where: { id: offerId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });
  }

  /**
   * Record offer redemption with order details
   */
  async markRedeemed(offerId: string, orderId: string, revenue: number) {
    return this.prisma.proactiveOffer.update({
      where: { id: offerId },
      data: {
        redeemedAt: new Date(),
        resultOrderId: orderId,
        resultRevenue: revenue,
      },
    });
  }

  /**
   * Expire all offers past their expiration date
   */
  async expireOldOffers(merchantId: string): Promise<number> {
    const result = await this.prisma.proactiveOffer.updateMany({
      where: {
        merchantId,
        status: 'active',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'expired',
        expiredAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} offers for merchant ${merchantId}`);
    }

    return result.count;
  }

  /**
   * Cancel a specific offer
   */
  async cancelOffer(offerId: string) {
    return this.prisma.proactiveOffer.update({
      where: { id: offerId },
      data: { status: 'cancelled' },
    });
  }
}
