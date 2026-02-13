import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Customer Intelligence Service
 * Calculates CLV, RFM segmentation, health scores, churn risk,
 * and purchase patterns for all customers.
 */
@Injectable()
export class CustomerIntelligenceService {
  private readonly logger = new Logger(CustomerIntelligenceService.name);

  constructor(private prisma: PrismaService) {}

  // ===================================================
  // CALCULATE ALL INSIGHTS FOR A MERCHANT
  // ===================================================
  async calculateInsights(merchantId: string): Promise<{ processed: number }> {
    this.logger.log(`Calculating customer insights for merchant: ${merchantId}`);

    // Get all customers with their orders
    const customers = await this.prisma.shopifyCustomer.findMany({
      where: { merchantId },
    });

    // Get all orders for this merchant, grouped by customer
    const orders = await this.prisma.orderLocal.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'asc' },
    });

    // Group orders by shopifyCustomerId
    const ordersByCustomer = new Map<string, any[]>();
    for (const order of orders) {
      if (!order.shopifyCustomerId) continue;
      const key = order.shopifyCustomerId.toString();
      if (!ordersByCustomer.has(key)) ordersByCustomer.set(key, []);
      ordersByCustomer.get(key)!.push(order);
    }

    // Calculate metrics for RFM thresholds
    const allTotalSpent: number[] = [];
    const allOrderCounts: number[] = [];
    const allRecencyDays: number[] = [];
    const now = new Date();

    for (const customer of customers) {
      const custOrders = ordersByCustomer.get(customer.shopifyCustomerId.toString()) || [];
      const totalSpent = Number(customer.totalSpent || 0);
      const orderCount = custOrders.length || customer.ordersCount || 0;

      if (totalSpent > 0) allTotalSpent.push(totalSpent);
      if (orderCount > 0) allOrderCounts.push(orderCount);

      if (custOrders.length > 0) {
        const lastOrderDate = new Date(custOrders[custOrders.length - 1].createdAt);
        const daysSince = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        allRecencyDays.push(daysSince);
      }
    }

    // Calculate RFM quintile thresholds
    const monetaryThresholds = this.calculateQuintiles(allTotalSpent);
    const frequencyThresholds = this.calculateQuintiles(allOrderCounts);
    const recencyThresholds = this.calculateQuintiles(allRecencyDays);

    let processed = 0;

    for (const customer of customers) {
      try {
        const custOrders = ordersByCustomer.get(customer.shopifyCustomerId.toString()) || [];
        await this.calculateCustomerInsight(customer, custOrders, now, {
          monetaryThresholds,
          frequencyThresholds,
          recencyThresholds,
        });
        processed++;
      } catch (error) {
        this.logger.warn(`Failed to calculate insight for customer ${customer.id}: ${error.message}`);
      }
    }

    this.logger.log(`Calculated insights for ${processed} customers.`);
    return { processed };
  }

  // ===================================================
  // CALCULATE INSIGHT FOR A SINGLE CUSTOMER
  // ===================================================
  private async calculateCustomerInsight(
    customer: any,
    orders: any[],
    now: Date,
    thresholds: {
      monetaryThresholds: number[];
      frequencyThresholds: number[];
      recencyThresholds: number[];
    },
  ) {
    const totalSpent = Number(customer.totalSpent || 0);
    const orderCount = orders.length || customer.ordersCount || 0;

    // --- Recency ---
    let daysSinceLastOrder: number | null = null;
    let lastOrderAt: Date | null = null;
    let firstOrderAt: Date | null = null;

    if (orders.length > 0) {
      lastOrderAt = new Date(orders[orders.length - 1].createdAt);
      firstOrderAt = new Date(orders[0].createdAt);
      daysSinceLastOrder = Math.floor(
        (now.getTime() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    // --- Average days between orders ---
    let avgDaysBetween: number | null = null;
    if (orders.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < orders.length; i++) {
        const prev = new Date(orders[i - 1].createdAt).getTime();
        const curr = new Date(orders[i].createdAt).getTime();
        gaps.push((curr - prev) / (1000 * 60 * 60 * 24));
      }
      avgDaysBetween = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    }

    // --- Purchase frequency label ---
    const purchaseFrequency = this.getPurchaseFrequency(avgDaysBetween);

    // --- RFM Scores (1-5 each, 5 is best) ---
    const rfmRecency = daysSinceLastOrder !== null
      ? this.getQuintileScore(daysSinceLastOrder, thresholds.recencyThresholds, true) // Lower is better
      : 1;
    const rfmFrequency = this.getQuintileScore(orderCount, thresholds.frequencyThresholds, false);
    const rfmMonetary = this.getQuintileScore(totalSpent, thresholds.monetaryThresholds, false);
    const rfmSegment = this.getRFMSegment(rfmRecency, rfmFrequency, rfmMonetary);

    // --- CLV ---
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
    const maxOrderValue = orders.length > 0
      ? Math.max(...orders.map(o => Number(o.totalPrice || 0)))
      : 0;

    // Simple CLV: avg order * frequency per year * expected years
    const customerAgeYears = firstOrderAt
      ? Math.max(1, (now.getTime() - firstOrderAt.getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 1;
    const ordersPerYear = orderCount / customerAgeYears;
    const projectedClv = avgOrderValue * ordersPerYear * 3; // 3-year projection
    const clvTier = this.getCLVTier(projectedClv);

    // --- Health Score (0-100) ---
    const healthScore = this.calculateHealthScore({
      rfmRecency,
      rfmFrequency,
      rfmMonetary,
      orderCount,
      daysSinceLastOrder,
      avgDaysBetween,
    });

    // --- Churn Risk ---
    const churnRisk = this.getChurnRisk(daysSinceLastOrder, avgDaysBetween, orderCount);

    // --- Order Trend (increasing, stable, declining) ---
    const orderTrend = this.getOrderTrend(orders, now);

    // --- Preferred categories (product types from line items) ---
    const preferredCategories = this.extractPreferredCategories(orders);
    const preferredVendors = this.extractPreferredVendors(orders);

    // --- Is Returning ---
    const isReturning = orderCount >= 2;

    // Upsert insight
    await this.prisma.customerInsight.upsert({
      where: { shopifyCustomerId: customer.id },
      create: {
        shopifyCustomerId: customer.id,
        clvScore: totalSpent,
        projectedClv,
        clvTier,
        rfmRecency,
        rfmFrequency,
        rfmMonetary,
        rfmSegment,
        healthScore,
        churnRisk,
        daysSinceLastOrder,
        avgDaysBetweenOrders: avgDaysBetween,
        purchaseFrequency,
        preferredCategories: preferredCategories.length > 0 ? preferredCategories : Prisma.JsonNull,
        preferredVendors: preferredVendors.length > 0 ? preferredVendors : Prisma.JsonNull,
        avgOrderValue,
        maxOrderValue,
        orderTrend,
        firstOrderAt,
        lastOrderAt,
        customerSince: customer.createdAt,
        isReturning,
        calculatedAt: now,
      },
      update: {
        clvScore: totalSpent,
        projectedClv,
        clvTier,
        rfmRecency,
        rfmFrequency,
        rfmMonetary,
        rfmSegment,
        healthScore,
        churnRisk,
        daysSinceLastOrder,
        avgDaysBetweenOrders: avgDaysBetween,
        purchaseFrequency,
        preferredCategories: preferredCategories.length > 0 ? preferredCategories : Prisma.JsonNull,
        preferredVendors: preferredVendors.length > 0 ? preferredVendors : Prisma.JsonNull,
        avgOrderValue,
        maxOrderValue,
        orderTrend,
        firstOrderAt,
        lastOrderAt,
        customerSince: customer.createdAt,
        isReturning,
        calculatedAt: now,
      },
    });
  }

  // ===================================================
  // RFM SEGMENT MAPPING
  // ===================================================
  private getRFMSegment(r: number, f: number, m: number): string {
    const score = r * 100 + f * 10 + m;

    // Champions: R=5, F=4-5, M=4-5
    if (r >= 4 && f >= 4 && m >= 4) return 'champions';
    // Loyal: R=3-5, F=4-5, M=3-5
    if (r >= 3 && f >= 4) return 'loyal';
    // Potential Loyalist: R=4-5, F=2-3, M=2-3
    if (r >= 4 && f >= 2 && f <= 3) return 'potential_loyalist';
    // New Customers: R=5, F=1, M=1-2
    if (r >= 4 && f <= 1) return 'new_customers';
    // Promising: R=3-4, F=1-2, M=1-2
    if (r >= 3 && f <= 2) return 'promising';
    // Need Attention: R=2-3, F=2-3, M=2-3
    if (r >= 2 && r <= 3 && f >= 2 && f <= 3) return 'need_attention';
    // About to Sleep: R=2, F=1-2, M=1-2
    if (r === 2 && f <= 2) return 'about_to_sleep';
    // At Risk: R=1-2, F=3-5, M=3-5
    if (r <= 2 && f >= 3) return 'at_risk';
    // Can't Lose: R=1, F=4-5, M=4-5
    if (r <= 1 && f >= 4 && m >= 4) return 'cant_lose';
    // Hibernating: R=1-2, F=1-2, M=1-2
    if (r <= 2 && f <= 2) return 'hibernating';
    // Lost: R=1, F=1, M=1
    if (r <= 1 && f <= 1) return 'lost';

    return 'other';
  }

  // ===================================================
  // HEALTH SCORE (0-100)
  // ===================================================
  private calculateHealthScore(params: {
    rfmRecency: number;
    rfmFrequency: number;
    rfmMonetary: number;
    orderCount: number;
    daysSinceLastOrder: number | null;
    avgDaysBetween: number | null;
  }): number {
    let score = 0;

    // RFM component (60% weight)
    score += (params.rfmRecency / 5) * 25;   // Recency: 0-25
    score += (params.rfmFrequency / 5) * 20;  // Frequency: 0-20
    score += (params.rfmMonetary / 5) * 15;   // Monetary: 0-15

    // Order count bonus (15% weight)
    score += Math.min(params.orderCount / 10, 1) * 15;

    // Recency bonus (15% weight)
    if (params.daysSinceLastOrder !== null) {
      if (params.daysSinceLastOrder <= 30) score += 15;
      else if (params.daysSinceLastOrder <= 90) score += 10;
      else if (params.daysSinceLastOrder <= 180) score += 5;
    }

    // Regularity bonus (10% weight)
    if (params.avgDaysBetween !== null && params.avgDaysBetween > 0) {
      if (params.avgDaysBetween <= 30) score += 10;
      else if (params.avgDaysBetween <= 60) score += 7;
      else if (params.avgDaysBetween <= 90) score += 4;
    }

    return Math.round(Math.min(score, 100));
  }

  // ===================================================
  // CHURN RISK
  // ===================================================
  private getChurnRisk(
    daysSinceLastOrder: number | null,
    avgDaysBetween: number | null,
    orderCount: number,
  ): string {
    if (orderCount === 0) return 'new';
    if (daysSinceLastOrder === null) return 'unknown';

    // If customer has a pattern, compare to it
    if (avgDaysBetween && avgDaysBetween > 0) {
      const ratio = daysSinceLastOrder / avgDaysBetween;
      if (ratio <= 1.5) return 'low';
      if (ratio <= 2.5) return 'medium';
      if (ratio <= 4) return 'high';
      return 'critical';
    }

    // Fall back to absolute thresholds
    if (daysSinceLastOrder <= 30) return 'low';
    if (daysSinceLastOrder <= 90) return 'medium';
    if (daysSinceLastOrder <= 180) return 'high';
    return 'critical';
  }

  // ===================================================
  // CLV TIER
  // ===================================================
  private getCLVTier(projectedClv: number): string {
    if (projectedClv >= 10000) return 'platinum';
    if (projectedClv >= 5000) return 'gold';
    if (projectedClv >= 1000) return 'silver';
    return 'bronze';
  }

  // ===================================================
  // PURCHASE FREQUENCY LABEL
  // ===================================================
  private getPurchaseFrequency(avgDaysBetween: number | null): string {
    if (avgDaysBetween === null) return 'one_time';
    if (avgDaysBetween <= 7) return 'weekly';
    if (avgDaysBetween <= 14) return 'biweekly';
    if (avgDaysBetween <= 35) return 'monthly';
    if (avgDaysBetween <= 100) return 'quarterly';
    if (avgDaysBetween <= 400) return 'yearly';
    return 'irregular';
  }

  // ===================================================
  // ORDER TREND
  // ===================================================
  private getOrderTrend(orders: any[], now: Date): string {
    if (orders.length < 3) return 'insufficient_data';

    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const recentOrders = orders.filter(o => new Date(o.createdAt) >= sixMonthsAgo).length;
    const olderOrders = orders.filter(
      o => new Date(o.createdAt) >= twelveMonthsAgo && new Date(o.createdAt) < sixMonthsAgo,
    ).length;

    if (recentOrders > olderOrders * 1.3) return 'increasing';
    if (recentOrders < olderOrders * 0.7) return 'declining';
    return 'stable';
  }

  // ===================================================
  // PREFERRED CATEGORIES (from line items)
  // ===================================================
  private extractPreferredCategories(orders: any[]): string[] {
    const categories = new Map<string, number>();

    for (const order of orders) {
      const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
      for (const item of lineItems) {
        // Try to extract product type from line item
        const category = item.product_type || item.productType || item.vendor || 'Unknown';
        categories.set(category, (categories.get(category) || 0) + (item.quantity || 1));
      }
    }

    // Sort by count and return top 5
    return Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  // ===================================================
  // PREFERRED VENDORS
  // ===================================================
  private extractPreferredVendors(orders: any[]): string[] {
    const vendors = new Map<string, number>();

    for (const order of orders) {
      const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
      for (const item of lineItems) {
        const vendor = item.vendor || 'Unknown';
        vendors.set(vendor, (vendors.get(vendor) || 0) + (item.quantity || 1));
      }
    }

    return Array.from(vendors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  // ===================================================
  // QUINTILE CALCULATION
  // ===================================================
  private calculateQuintiles(values: number[]): number[] {
    if (values.length === 0) return [0, 0, 0, 0];
    const sorted = [...values].sort((a, b) => a - b);
    return [
      sorted[Math.floor(sorted.length * 0.2)] || 0,
      sorted[Math.floor(sorted.length * 0.4)] || 0,
      sorted[Math.floor(sorted.length * 0.6)] || 0,
      sorted[Math.floor(sorted.length * 0.8)] || 0,
    ];
  }

  private getQuintileScore(value: number, thresholds: number[], inversed: boolean): number {
    if (inversed) {
      // Lower is better (e.g., recency — fewer days = better)
      if (value <= thresholds[0]) return 5;
      if (value <= thresholds[1]) return 4;
      if (value <= thresholds[2]) return 3;
      if (value <= thresholds[3]) return 2;
      return 1;
    } else {
      // Higher is better (e.g., monetary, frequency)
      if (value >= thresholds[3]) return 5;
      if (value >= thresholds[2]) return 4;
      if (value >= thresholds[1]) return 3;
      if (value >= thresholds[0]) return 2;
      return 1;
    }
  }

  // ===================================================
  // GET INSIGHTS SUMMARY FOR ADMIN DASHBOARD
  // ===================================================
  async getInsightsSummary(merchantId: string) {
    // Get all customers with insights
    const customers = await this.prisma.shopifyCustomer.findMany({
      where: { merchantId },
      include: { insight: true },
    });

    const insights = customers.filter(c => c.insight).map(c => c.insight!);

    // Segment distribution
    const segmentDistribution = new Map<string, number>();
    const tierDistribution = new Map<string, number>();
    const riskDistribution = new Map<string, number>();
    let totalClv = 0;
    let returningCount = 0;

    for (const insight of insights) {
      // Segment
      const segment = insight.rfmSegment || 'unknown';
      segmentDistribution.set(segment, (segmentDistribution.get(segment) || 0) + 1);

      // CLV Tier
      const tier = insight.clvTier || 'unknown';
      tierDistribution.set(tier, (tierDistribution.get(tier) || 0) + 1);

      // Churn Risk
      const risk = insight.churnRisk || 'unknown';
      riskDistribution.set(risk, (riskDistribution.get(risk) || 0) + 1);

      totalClv += Number(insight.projectedClv || 0);
      if (insight.isReturning) returningCount++;
    }

    return {
      totalCustomers: customers.length,
      analyzedCustomers: insights.length,
      returningCustomerRate: customers.length > 0
        ? ((returningCount / customers.length) * 100).toFixed(1)
        : 0,
      averageClv: insights.length > 0
        ? (totalClv / insights.length).toFixed(2)
        : 0,
      segmentDistribution: Object.fromEntries(segmentDistribution),
      tierDistribution: Object.fromEntries(tierDistribution),
      riskDistribution: Object.fromEntries(riskDistribution),
      topChampions: insights
        .filter(i => i.rfmSegment === 'champions')
        .length,
      atRiskCount: insights
        .filter(i => i.churnRisk === 'high' || i.churnRisk === 'critical')
        .length,
    };
  }

  // ===================================================
  // GET CUSTOMER DETAIL WITH INSIGHT
  // ===================================================
  async getCustomerWithInsight(customerId: string) {
    return this.prisma.shopifyCustomer.findUnique({
      where: { id: customerId },
      include: { insight: true },
    });
  }

  // ===================================================
  // GET CUSTOMERS BY SEGMENT
  // ===================================================
  async getCustomersBySegment(merchantId: string, segment: string, limit = 50) {
    const customers = await this.prisma.shopifyCustomer.findMany({
      where: {
        merchantId,
        insight: { rfmSegment: segment },
      },
      include: { insight: true },
      take: limit,
      orderBy: { totalSpent: 'desc' },
    });

    return customers;
  }

  // ===================================================
  // GET AT-RISK CUSTOMERS
  // ===================================================
  async getAtRiskCustomers(merchantId: string, limit = 50) {
    return this.prisma.shopifyCustomer.findMany({
      where: {
        merchantId,
        insight: {
          churnRisk: { in: ['high', 'critical'] },
        },
      },
      include: { insight: true },
      take: limit,
      orderBy: { totalSpent: 'desc' },
    });
  }
}
