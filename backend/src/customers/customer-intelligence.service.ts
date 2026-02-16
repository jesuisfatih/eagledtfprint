import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Customer Intelligence Service — Ultra Deep v2.0
 */
@Injectable()
export class CustomerIntelligenceService {
  private readonly logger = new Logger(CustomerIntelligenceService.name);

  constructor(
    private prisma: PrismaService,
    private dittofeed: DittofeedService,
  ) {}

  // ===================================================
  // CALCULATE ALL INSIGHTS FOR A MERCHANT
  // ===================================================
  async calculateInsights(merchantId: string): Promise<{ processed: number }> {
    this.logger.log(`Calculating customer insights for merchant: ${merchantId}`);

    const customers = await this.prisma.shopifyCustomer.findMany({
      where: { merchantId },
    });

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
    const allAov: number[] = [];
    const now = new Date();

    for (const customer of customers) {
      const custOrders = ordersByCustomer.get(customer.shopifyCustomerId.toString()) || [];
      const totalSpent = Number(customer.totalSpent || 0);
      const orderCount = custOrders.length || customer.ordersCount || 0;

      if (totalSpent > 0) allTotalSpent.push(totalSpent);
      if (orderCount > 0) {
        allOrderCounts.push(orderCount);
        allAov.push(totalSpent / orderCount);
      }

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

    // Global benchmarks for comparative metrics
    const globalBenchmarks = {
      avgAov: allAov.length > 0 ? allAov.reduce((a, b) => a + b, 0) / allAov.length : 0,
      avgTotalSpent: allTotalSpent.length > 0 ? allTotalSpent.reduce((a, b) => a + b, 0) / allTotalSpent.length : 0,
      avgOrderCount: allOrderCounts.length > 0 ? allOrderCounts.reduce((a, b) => a + b, 0) / allOrderCounts.length : 0,
      medianTotalSpent: allTotalSpent.length > 0 ? this.median(allTotalSpent) : 0,
      totalCustomers: customers.length,
    };

    let processed = 0;

    for (const customer of customers) {
      try {
        const custOrders = ordersByCustomer.get(customer.shopifyCustomerId.toString()) || [];
        await this.calculateCustomerInsight(customer, custOrders, now, {
          monetaryThresholds,
          frequencyThresholds,
          recencyThresholds,
        }, globalBenchmarks);
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
    globalBenchmarks: any,
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

    const purchaseFrequency = this.getPurchaseFrequency(avgDaysBetween);

    // --- RFM Scores ---
    const rfmRecency = daysSinceLastOrder !== null
      ? this.getQuintileScore(daysSinceLastOrder, thresholds.recencyThresholds, true)
      : 1;
    const rfmFrequency = this.getQuintileScore(orderCount, thresholds.frequencyThresholds, false);
    const rfmMonetary = this.getQuintileScore(totalSpent, thresholds.monetaryThresholds, false);
    const rfmSegment = this.getRFMSegment(rfmRecency, rfmFrequency, rfmMonetary);

    // --- CLV ---
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
    const maxOrderValue = orders.length > 0
      ? Math.max(...orders.map(o => Number(o.totalPrice || 0)))
      : 0;

    const customerAgeYears = firstOrderAt
      ? Math.max(1, (now.getTime() - firstOrderAt.getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 1;
    const ordersPerYear = orderCount / customerAgeYears;
    const projectedClv = avgOrderValue * ordersPerYear * 3;
    const clvTier = this.getCLVTier(projectedClv);

    // --- Health Score ---
    const healthScore = this.calculateHealthScore({
      rfmRecency, rfmFrequency, rfmMonetary,
      orderCount, daysSinceLastOrder, avgDaysBetween,
    });

    // --- Churn Risk ---
    const churnRisk = this.getChurnRisk(daysSinceLastOrder, avgDaysBetween, orderCount);
    const orderTrend = this.getOrderTrend(orders, now);
    const preferredCategories = this.extractPreferredCategories(orders);
    const preferredVendors = this.extractPreferredVendors(orders);
    const isReturning = orderCount >= 2;

    // --- DEEP METRICS ENGINE (50+ Metrics) ---
    const deepMetrics = this.calculateDeepMetrics(orders, now, customer, firstOrderAt, lastOrderAt, totalSpent, globalBenchmarks);

    // Upsert insight
    await this.prisma.customerInsight.upsert({
      where: { shopifyCustomerId: customer.id },
      create: {
        shopifyCustomerId: customer.id,
        clvScore: totalSpent,
        projectedClv,
        clvTier,
        rfmRecency, rfmFrequency, rfmMonetary, rfmSegment,
        healthScore,
        churnRisk,
        daysSinceLastOrder,
        avgDaysBetweenOrders: avgDaysBetween,
        purchaseFrequency,
        preferredCategories: preferredCategories.length > 0 ? preferredCategories : Prisma.JsonNull,
        preferredVendors: preferredVendors.length > 0 ? preferredVendors : Prisma.JsonNull,
        avgOrderValue, maxOrderValue, orderTrend,
        firstOrderAt, lastOrderAt,
        customerSince: customer.createdAt,
        isReturning,
        deepMetrics: deepMetrics as any,
        calculatedAt: now,
      },
      update: {
        clvScore: totalSpent,
        projectedClv,
        clvTier,
        rfmRecency, rfmFrequency, rfmMonetary, rfmSegment,
        healthScore,
        churnRisk,
        daysSinceLastOrder,
        avgDaysBetweenOrders: avgDaysBetween,
        purchaseFrequency,
        preferredCategories: preferredCategories.length > 0 ? preferredCategories : Prisma.JsonNull,
        preferredVendors: preferredVendors.length > 0 ? preferredVendors : Prisma.JsonNull,
        avgOrderValue, maxOrderValue, orderTrend,
        firstOrderAt, lastOrderAt,
        customerSince: customer.createdAt,
        isReturning,
        deepMetrics: deepMetrics as any,
        calculatedAt: now,
      },
    });
  }

  // ===================================================
  // DEEP METRICS ENGINE v2.0 (50+ Ultra Metrics)
  // ===================================================
  private calculateDeepMetrics(
    orders: any[],
    now: Date,
    customer: any,
    firstOrderAt: Date | null,
    lastOrderAt: Date | null,
    totalSpent: number,
    globalBenchmarks: any,
  ) {
    if (orders.length === 0) return {};

    const orderCount = orders.length;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // ──── TIME WINDOW ORDERS ────
    const recent7dOrders = orders.filter(o => new Date(o.createdAt) >= sevenDaysAgo);
    const recent30dOrders = orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
    const prev30dOrders = orders.filter(o => new Date(o.createdAt) >= sixtyDaysAgo && new Date(o.createdAt) < thirtyDaysAgo);
    const recent90dOrders = orders.filter(o => new Date(o.createdAt) >= ninetyDaysAgo);

    const recent30dSpending = recent30dOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
    const prev30dSpending = prev30dOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
    const recent90dSpending = recent90dOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    // ──── 1. GROWTH RATES ────
    const spendingGrowthRate = prev30dSpending > 0
      ? ((recent30dSpending - prev30dSpending) / prev30dSpending) * 100
      : (recent30dSpending > 0 ? 100 : 0);

    const orderGrowthRate = prev30dOrders.length > 0
      ? ((recent30dOrders.length - prev30dOrders.length) / prev30dOrders.length) * 100
      : (recent30dOrders.length > 0 ? 100 : 0);

    // ──── 2. PURCHASE VELOCITY ────
    const customerAgeDays = firstOrderAt
      ? Math.max(1, (now.getTime() - firstOrderAt.getTime()) / (1000 * 60 * 60 * 24))
      : 1;
    const daysSinceLastOrder = lastOrderAt
      ? Math.round((now.getTime() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const ordersPerMonth = (orderCount / customerAgeDays) * 30;

    // ──── 3. TIME PATTERNS ────
    const hourDistribution = new Array(24).fill(0);
    const dayDistribution = new Array(7).fill(0);
    const monthDistribution = new Array(12).fill(0);
    orders.forEach(o => {
      const d = new Date(o.createdAt);
      hourDistribution[d.getHours()]++;
      dayDistribution[d.getDay()]++;
      monthDistribution[d.getMonth()]++;
    });

    const peakHour = hourDistribution.indexOf(Math.max(...hourDistribution));
    const peakDay = dayDistribution.indexOf(Math.max(...dayDistribution));
    const peakMonth = monthDistribution.indexOf(Math.max(...monthDistribution));

    // ──── 4. LINE ITEM ANALYSIS ────
    const productFrequency = new Map<string, number>();
    const vendorFrequency = new Map<string, number>();
    const categoryFrequency = new Map<string, number>();
    const variantFrequency = new Map<string, number>();
    let totalItems = 0;
    let totalDiscounts = 0;
    let discountedOrders = 0;
    let totalRefundAmount = 0;
    let refundedOrders = 0;
    const orderValues: number[] = [];

    orders.forEach(o => {
      const lineItems = Array.isArray(o.lineItems) ? o.lineItems : [];
      const orderValue = Number(o.totalPrice || 0);
      orderValues.push(orderValue);
      totalItems += lineItems.reduce((sum: number, li: any) => sum + (li.quantity || 1), 0);

      const discounts = Number(o.totalDiscounts || 0);
      if (discounts > 0) {
        totalDiscounts += discounts;
        discountedOrders++;
      }

      // Track refunds
      const refundAmount = Number(o.refundAmount || 0);
      if (refundAmount > 0) {
        totalRefundAmount += refundAmount;
        refundedOrders++;
      }

      lineItems.forEach((li: any) => {
        const name = li.title || 'Unknown';
        const vendor = li.vendor || 'Unknown';
        const category = li.product_type || li.productType || 'Unknown';
        const variant = li.variant_title || li.variantTitle || '';

        productFrequency.set(name, (productFrequency.get(name) || 0) + (li.quantity || 1));
        vendorFrequency.set(vendor, (vendorFrequency.get(vendor) || 0) + (li.quantity || 1));
        categoryFrequency.set(category, (categoryFrequency.get(category) || 0) + (li.quantity || 1));
        if (variant) variantFrequency.set(variant, (variantFrequency.get(variant) || 0) + (li.quantity || 1));
      });
    });

    const topProduct = Array.from(productFrequency.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topCategory = Array.from(categoryFrequency.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topVendor = Array.from(vendorFrequency.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const top5Products = Array.from(productFrequency.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
    const top5Categories = Array.from(categoryFrequency.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));

    // ──── 5. REGULARITY SCORE ────
    let regularityScore = 0;
    let orderGapStdDev = 0;
    let avgOrderGap = 0;
    if (orders.length >= 3) {
      const gaps: number[] = [];
      for (let i = 1; i < orders.length; i++) {
        gaps.push((new Date(orders[i].createdAt).getTime() - new Date(orders[i - 1].createdAt).getTime()) / (1000 * 3600 * 24));
      }
      avgOrderGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const variance = gaps.reduce((a, b) => a + Math.pow(b - avgOrderGap, 2), 0) / gaps.length;
      orderGapStdDev = Math.sqrt(variance);
      regularityScore = Math.max(0, 100 - (orderGapStdDev / (avgOrderGap || 1)) * 50);
    }

    // ──── 6. CHURN PROBABILITY ────
    let churnProbability = 0;
    if (orders.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < orders.length; i++) {
        gaps.push((new Date(orders[i].createdAt).getTime() - new Date(orders[i - 1].createdAt).getTime()) / (1000 * 3600 * 24));
      }
      const gapAvg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const daysSince = lastOrderAt ? (now.getTime() - lastOrderAt.getTime()) / (1000 * 3600 * 24) : 0;
      churnProbability = Math.min(100, Math.round((daysSince / (gapAvg * 2)) * 100));
    }

    // ──── 7. VIP & STATUS TAGS ────
    const isVipCandidate = totalSpent > 5000 && orderGrowthRate >= 0;
    const isDormantHighValue = totalSpent > 2000 && churnProbability > 70;
    const isRisingStar = orderCount < 5 && orderGrowthRate > 50 && recent30dSpending > 500;
    const isWhale = totalSpent > (globalBenchmarks.medianTotalSpent * 10);
    const isMicroBuyer = orderCount >= 10 && (totalSpent / orderCount) < 50;
    const isBigTicket = orderCount <= 3 && (totalSpent / Math.max(orderCount, 1)) > 1000;
    const isSeasonalBuyer = this.detectSeasonalBuyer(orders);
    const isBulkBuyer = totalItems > 0 && (totalItems / orderCount) > 10;

    // ──── 8. DISCOUNT SENSITIVITY ────
    const discountSensitivity = orderCount > 0 ? (discountedOrders / orderCount) * 100 : 0;
    const avgDiscountPerOrder = discountedOrders > 0 ? totalDiscounts / discountedOrders : 0;
    const discountDrivenRevenue = discountedOrders > 0
      ? orders.filter(o => Number(o.totalDiscounts || 0) > 0).reduce((sum, o) => sum + Number(o.totalPrice || 0), 0)
      : 0;
    const discountRevenueRatio = totalSpent > 0 ? (discountDrivenRevenue / totalSpent) * 100 : 0;

    // ──── 9. MONETARY MOMENTUM ────
    const firstHalfOrders = orders.slice(0, Math.floor(orderCount / 2));
    const secondHalfOrders = orders.slice(Math.floor(orderCount / 2));
    const firstHalfAov = firstHalfOrders.length > 0 ? firstHalfOrders.reduce((s, o) => s + Number(o.totalPrice || 0), 0) / firstHalfOrders.length : 0;
    const secondHalfAov = secondHalfOrders.length > 0 ? secondHalfOrders.reduce((s, o) => s + Number(o.totalPrice || 0), 0) / secondHalfOrders.length : 0;
    const aovTrend = firstHalfAov > 0 ? ((secondHalfAov - firstHalfAov) / firstHalfAov) * 100 : 0;
    const monetaryMomentum = aovTrend > 10 ? 'accelerating' : (aovTrend < -10 ? 'decelerating' : 'stable');

    // ──── 10. PRODUCT DIVERSITY INDEX (Shannon Entropy) ────
    const totalProductUnits = Array.from(productFrequency.values()).reduce((a, b) => a + b, 0);
    let productDiversityIndex = 0;
    if (totalProductUnits > 0 && productFrequency.size > 1) {
      for (const count of productFrequency.values()) {
        const p = count / totalProductUnits;
        if (p > 0) productDiversityIndex -= p * Math.log2(p);
      }
      // Normalize: 0 (single product) to 1 (max diversity)
      const maxEntropy = Math.log2(productFrequency.size);
      productDiversityIndex = maxEntropy > 0 ? productDiversityIndex / maxEntropy : 0;
    }

    // ──── 11. BASKET ANALYSIS ────
    const basketSizes: number[] = orders.map(o => {
      const li = Array.isArray(o.lineItems) ? o.lineItems : [];
      return li.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
    });
    const avgBasketSize = basketSizes.length > 0 ? basketSizes.reduce((a, b) => a + b, 0) / basketSizes.length : 0;
    const maxBasketSize = basketSizes.length > 0 ? Math.max(...basketSizes) : 0;
    const basketSizeGrowing = basketSizes.length >= 4
      ? basketSizes.slice(-Math.floor(basketSizes.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(basketSizes.length / 2) >
        basketSizes.slice(0, Math.floor(basketSizes.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(basketSizes.length / 2)
      : false;

    // ──── 12. REPEAT PURCHASE RATE ────
    const repeatedProducts = Array.from(productFrequency.entries()).filter(([, count]) => count >= 2);
    const repeatPurchaseRate = productFrequency.size > 0 ? (repeatedProducts.length / productFrequency.size) * 100 : 0;

    // ──── 13. PRICE SENSITIVITY ANALYSIS ────
    const orderValuesSorted = [...orderValues].sort((a, b) => a - b);
    const minOrderValue = orderValuesSorted[0] || 0;
    const maxOrderValueCalc = orderValuesSorted[orderValuesSorted.length - 1] || 0;
    const medianOrderValue = this.median(orderValues);
    const orderValueRange = maxOrderValueCalc - minOrderValue;
    const priceConsistency = orderValues.length >= 2
      ? 100 - ((orderValueRange / (medianOrderValue || 1)) * 50)
      : 100;

    // ──── 14. LIFECYCLE STAGE ────
    const lifecycleStage = this.getLifecycleStage(orderCount, daysSinceLastOrder, churnProbability, customerAgeDays);

    // ──── 15. REACTIVATION POTENTIAL ────
    const reactivationPotential = this.getReactivationPotential(totalSpent, orderCount, churnProbability, daysSinceLastOrder);

    // ──── 16. ENGAGEMENT VELOCITY ────
    // How fast are they accelerating/decelerating engagement?
    const engagementVelocity = this.getEngagementVelocity(orders, now);

    // ──── 17. DAY-PART ANALYSIS ────
    const morningOrders = hourDistribution.slice(6, 12).reduce((a, b) => a + b, 0); // 6am-12pm
    const afternoonOrders = hourDistribution.slice(12, 18).reduce((a, b) => a + b, 0); // 12pm-6pm
    const eveningOrders = hourDistribution.slice(18, 22).reduce((a, b) => a + b, 0); // 6pm-10pm
    const nightOrders = hourDistribution.slice(22).concat(hourDistribution.slice(0, 6)).reduce((a, b) => a + b, 0); // 10pm-6am
    const preferredDayPart = [
      { name: 'morning', count: morningOrders },
      { name: 'afternoon', count: afternoonOrders },
      { name: 'evening', count: eveningOrders },
      { name: 'night', count: nightOrders },
    ].sort((a, b) => b.count - a.count)[0]?.name || 'unknown';

    // ──── 18. SEASONAL PATTERN ────
    const quarterDistribution = [
      monthDistribution.slice(0, 3).reduce((a, b) => a + b, 0), // Q1
      monthDistribution.slice(3, 6).reduce((a, b) => a + b, 0), // Q2
      monthDistribution.slice(6, 9).reduce((a, b) => a + b, 0), // Q3
      monthDistribution.slice(9, 12).reduce((a, b) => a + b, 0), // Q4
    ];
    const peakQuarter = quarterDistribution.indexOf(Math.max(...quarterDistribution)) + 1;
    const seasonalityScore = this.calculateSeasonalityScore(quarterDistribution);

    // ──── 19. REFUND ANALYSIS ────
    const refundRate = orderCount > 0 ? (refundedOrders / orderCount) * 100 : 0;
    const avgRefundAmount = refundedOrders > 0 ? totalRefundAmount / refundedOrders : 0;

    // ──── 20. NET REVENUE & RETENTION METRICS ────
    const netRevenue = totalSpent - totalRefundAmount - totalDiscounts;
    const revenueRetentionRate = totalSpent > 0 ? (netRevenue / totalSpent) * 100 : 100;

    // ──── 21. COMPARATIVE BENCHMARKS ────
    const aovVsAvg = globalBenchmarks.avgAov > 0 ? ((totalSpent / Math.max(orderCount, 1)) / globalBenchmarks.avgAov) * 100 - 100 : 0;
    const spentVsAvg = globalBenchmarks.avgTotalSpent > 0 ? (totalSpent / globalBenchmarks.avgTotalSpent) * 100 - 100 : 0;
    const ordersVsAvg = globalBenchmarks.avgOrderCount > 0 ? (orderCount / globalBenchmarks.avgOrderCount) * 100 - 100 : 0;
    const customerPercentile = this.getCustomerPercentile(totalSpent, globalBenchmarks);

    // ──── 22. PREDICTED NEXT ORDER ────
    let predictedNextOrderDays: number | null = null;
    if (orders.length >= 2 && avgOrderGap > 0 && lastOrderAt) {
      const daysSinceLast = (now.getTime() - lastOrderAt.getTime()) / (1000 * 3600 * 24);
      predictedNextOrderDays = Math.max(0, Math.round(avgOrderGap - daysSinceLast));
    }

    // ──── 23. CROSS-SELL AFFINITY ────
    const productPairs = this.calculateProductPairs(orders);

    // ──── 24. ORDER VALUE TREND SPARKLINE ────
    const recentOrderValues = orders.slice(-10).map(o => Number(o.totalPrice || 0));

    // ──── 25. PAYMENT BEHAVIOR ────
    const paymentMethods = new Map<string, number>();
    orders.forEach(o => {
      const method = o.paymentGateway || o.gateway || 'unknown';
      paymentMethods.set(method, (paymentMethods.get(method) || 0) + 1);
    });
    const preferredPaymentMethod = Array.from(paymentMethods.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    return {
      // --- CORE METRICS ---
      recent7dOrders: recent7dOrders.length,
      recent30dOrders: recent30dOrders.length,
      recent90dOrders: recent90dOrders.length,
      recent30dSpending: Math.round(recent30dSpending * 100) / 100,
      prev30dSpending: Math.round(prev30dSpending * 100) / 100,
      recent90dSpending: Math.round(recent90dSpending * 100) / 100,
      spendingGrowthRate: Math.round(spendingGrowthRate),
      orderGrowthRate: Math.round(orderGrowthRate),
      ordersPerMonth: Number(ordersPerMonth.toFixed(1)),

      // --- TIME PATTERNS ---
      peakHour,
      peakDay, // 0-6 (Sunday-Saturday)
      peakMonth, // 0-11
      peakQuarter, // 1-4
      preferredDayPart,
      seasonalityScore: Math.round(seasonalityScore),

      // --- PRODUCT & BASKET ANALYSIS ---
      avgItemsPerOrder: Number((totalItems / orderCount).toFixed(1)),
      totalItemsPurchased: totalItems,
      revenuePerItem: totalItems > 0 ? Number((totalSpent / totalItems).toFixed(2)) : 0,
      topProduct,
      topCategory,
      topVendor,
      top5Products,
      top5Categories,
      uniqueProductsCount: productFrequency.size,
      uniqueVendorsCount: vendorFrequency.size,
      uniqueCategoriesCount: categoryFrequency.size,
      productDiversityIndex: Number(productDiversityIndex.toFixed(2)),
      avgBasketSize: Number(avgBasketSize.toFixed(1)),
      maxBasketSize,
      basketSizeGrowing,
      repeatPurchaseRate: Number(repeatPurchaseRate.toFixed(1)),
      brandLoyalty: productFrequency.size === 1 && orderCount > 2,

      // --- DISCOUNT & PRICE ANALYSIS ---
      discountUsageRate: Number(discountSensitivity.toFixed(1)),
      totalDiscountsSaved: Number(totalDiscounts.toFixed(2)),
      avgDiscountPerOrder: Number(avgDiscountPerOrder.toFixed(2)),
      discountRevenueRatio: Number(discountRevenueRatio.toFixed(1)),
      minOrderValue: Number(minOrderValue.toFixed(2)),
      maxOrderValue: Number(maxOrderValueCalc.toFixed(2)),
      medianOrderValue: Number(medianOrderValue.toFixed(2)),
      priceConsistency: Math.max(0, Math.round(priceConsistency)),

      // --- MONETARY MOMENTUM ---
      aovTrend: Number(aovTrend.toFixed(1)),
      monetaryMomentum,
      recentOrderValues,

      // --- BEHAVIORAL PATTERNS ---
      regularityScore: Math.round(regularityScore),
      churnProbability,
      loyaltyDurationDays: Math.round(customerAgeDays),
      weekendOrderRate: Math.round((dayDistribution[0] + dayDistribution[6]) / orderCount * 100),
      nightOrderRate: Math.round(nightOrders / orderCount * 100),
      avgOrderGapsDays: orders.length >= 2 ? Math.round(customerAgeDays / (orderCount - 1)) : 0,
      orderGapStdDev: Math.round(orderGapStdDev),

      // --- STATUS TAGS ---
      isVipCandidate,
      isDormantHighValue,
      isRisingStar,
      isWhale,
      isMicroBuyer,
      isBigTicket,
      isSeasonalBuyer,
      isBulkBuyer,

      // --- LIFECYCLE & ENGAGEMENT ---
      lifecycleStage,
      reactivationPotential,
      engagementVelocity,

      // --- REFUND & NET REVENUE ---
      refundRate: Number(refundRate.toFixed(1)),
      refundedOrders,
      avgRefundAmount: Number(avgRefundAmount.toFixed(2)),
      netRevenue: Number(netRevenue.toFixed(2)),
      revenueRetentionRate: Number(revenueRetentionRate.toFixed(1)),

      // --- COMPARATIVE BENCHMARKS ---
      aovVsAvg: Number(aovVsAvg.toFixed(1)),
      spentVsAvg: Number(spentVsAvg.toFixed(1)),
      ordersVsAvg: Number(ordersVsAvg.toFixed(1)),
      customerPercentile,

      // --- PREDICTIONS ---
      predictedNextOrderDays,
      productPairs,
      preferredPaymentMethod,
    };
  }

  // ===================================================
  // LIFECYCLE STAGE DETECTION
  // ===================================================
  private getLifecycleStage(orderCount: number, daysSince: number | null, churnProb: number, ageDays: number): string {
    if (orderCount === 0) return 'prospect';
    if (orderCount === 1 && (daysSince === null || daysSince <= 30)) return 'first_purchase';
    if (orderCount === 1 && daysSince !== null && daysSince > 30) return 'one_time';
    if (orderCount >= 2 && ageDays <= 60) return 'onboarding';
    if (churnProb > 80) return 'churning';
    if (churnProb > 50) return 'at_risk';
    if (orderCount >= 5 && churnProb <= 30) return 'loyal';
    if (orderCount >= 10 && churnProb <= 20) return 'advocate';
    return 'active';
  }

  // ===================================================
  // REACTIVATION POTENTIAL
  // ===================================================
  private getReactivationPotential(totalSpent: number, orderCount: number, churnProb: number, daysSince: number | null): string {
    if (churnProb <= 30) return 'not_needed';
    // High-value churning = high reactivation priority
    const valueScore = totalSpent > 5000 ? 3 : (totalSpent > 1000 ? 2 : 1);
    const frequencyScore = orderCount > 5 ? 3 : (orderCount > 2 ? 2 : 1);
    const recencyPenalty = daysSince !== null && daysSince > 365 ? -1 : 0;
    const score = valueScore + frequencyScore + recencyPenalty;
    if (score >= 5) return 'very_high';
    if (score >= 4) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  // ===================================================
  // ENGAGEMENT VELOCITY
  // ===================================================
  private getEngagementVelocity(orders: any[], now: Date): string {
    if (orders.length < 4) return 'insufficient_data';

    const halfPoint = Math.floor(orders.length / 2);
    const firstHalf = orders.slice(0, halfPoint);
    const secondHalf = orders.slice(halfPoint);

    const firstHalfDays = firstHalf.length >= 2
      ? (new Date(firstHalf[firstHalf.length - 1].createdAt).getTime() - new Date(firstHalf[0].createdAt).getTime()) / (1000 * 3600 * 24)
      : 1;
    const secondHalfDays = secondHalf.length >= 2
      ? (new Date(secondHalf[secondHalf.length - 1].createdAt).getTime() - new Date(secondHalf[0].createdAt).getTime()) / (1000 * 3600 * 24)
      : 1;

    const firstHalfFreq = firstHalf.length / Math.max(firstHalfDays, 1);
    const secondHalfFreq = secondHalf.length / Math.max(secondHalfDays, 1);

    const change = firstHalfFreq > 0 ? ((secondHalfFreq - firstHalfFreq) / firstHalfFreq) * 100 : 0;

    if (change > 30) return 'accelerating';
    if (change > 10) return 'growing';
    if (change > -10) return 'steady';
    if (change > -30) return 'slowing';
    return 'declining';
  }

  // ===================================================
  // SEASONAL BUYER DETECTION
  // ===================================================
  private detectSeasonalBuyer(orders: any[]): boolean {
    if (orders.length < 4) return false;
    const monthCounts = new Array(12).fill(0);
    orders.forEach(o => { monthCounts[new Date(o.createdAt).getMonth()]++; });
    const nonZeroMonths = monthCounts.filter(c => c > 0).length;
    // If orders concentrated in <= 4 months, seasonal
    return nonZeroMonths <= 4 && orders.length >= 3;
  }

  // ===================================================
  // SEASONALITY SCORE (0-100)
  // ===================================================
  private calculateSeasonalityScore(quarterDist: number[]): number {
    const total = quarterDist.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const expected = total / 4;
    const chiSquare = quarterDist.reduce((sum, obs) => sum + Math.pow(obs - expected, 2) / expected, 0);
    return Math.min(100, Math.round(chiSquare * 10)); // Normalize
  }

  // ===================================================
  // PRODUCT CO-PURCHASE PAIRS
  // ===================================================
  private calculateProductPairs(orders: any[]): Array<{ pair: string; count: number }> {
    const pairCounts = new Map<string, number>();
    for (const order of orders) {
      const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
      const products = [...new Set(lineItems.map((li: any) => li.title || 'Unknown'))];
      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const pair = [products[i], products[j]].sort().join(' + ');
          pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
        }
      }
    }
    return Array.from(pairCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pair, count]) => ({ pair, count }));
  }

  // ===================================================
  // CUSTOMER PERCENTILE
  // ===================================================
  private getCustomerPercentile(totalSpent: number, benchmarks: any): number {
    if (benchmarks.medianTotalSpent <= 0) return 50;
    const ratio = totalSpent / benchmarks.medianTotalSpent;
    if (ratio >= 10) return 99;
    if (ratio >= 5) return 95;
    if (ratio >= 3) return 90;
    if (ratio >= 2) return 80;
    if (ratio >= 1.5) return 70;
    if (ratio >= 1) return 60;
    if (ratio >= 0.5) return 40;
    if (ratio >= 0.25) return 25;
    return 10;
  }

  // ===================================================
  // HELPER: MEDIAN
  // ===================================================
  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // ===================================================
  // RFM SEGMENT MAPPING
  // ===================================================
  private getRFMSegment(r: number, f: number, m: number): string {
    if (r >= 4 && f >= 4 && m >= 4) return 'champions';
    if (r >= 3 && f >= 4) return 'loyal';
    if (r >= 4 && f >= 2 && f <= 3) return 'potential_loyalist';
    if (r >= 4 && f <= 1) return 'new_customers';
    if (r >= 3 && f <= 2) return 'promising';
    if (r >= 2 && r <= 3 && f >= 2 && f <= 3) return 'need_attention';
    if (r === 2 && f <= 2) return 'about_to_sleep';
    if (r <= 2 && f >= 3) return 'at_risk';
    if (r <= 1 && f >= 4 && m >= 4) return 'cant_lose';
    if (r <= 2 && f <= 2) return 'hibernating';
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
    score += (params.rfmRecency / 5) * 25;
    score += (params.rfmFrequency / 5) * 20;
    score += (params.rfmMonetary / 5) * 15;
    score += Math.min(params.orderCount / 10, 1) * 15;
    if (params.daysSinceLastOrder !== null) {
      if (params.daysSinceLastOrder <= 30) score += 15;
      else if (params.daysSinceLastOrder <= 90) score += 10;
      else if (params.daysSinceLastOrder <= 180) score += 5;
    }
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
  private getChurnRisk(daysSinceLastOrder: number | null, avgDaysBetween: number | null, orderCount: number): string {
    if (orderCount === 0) return 'new';
    if (daysSinceLastOrder === null) return 'unknown';
    if (avgDaysBetween && avgDaysBetween > 0) {
      const ratio = daysSinceLastOrder / avgDaysBetween;
      if (ratio <= 1.5) return 'low';
      if (ratio <= 2.5) return 'medium';
      if (ratio <= 4) return 'high';
      return 'critical';
    }
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
    const olderOrders = orders.filter(o => new Date(o.createdAt) >= twelveMonthsAgo && new Date(o.createdAt) < sixMonthsAgo).length;
    if (recentOrders > olderOrders * 1.3) return 'increasing';
    if (recentOrders < olderOrders * 0.7) return 'declining';
    return 'stable';
  }

  // ===================================================
  // PREFERRED CATEGORIES
  // ===================================================
  private extractPreferredCategories(orders: any[]): string[] {
    const categories = new Map<string, number>();
    for (const order of orders) {
      const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
      for (const item of lineItems) {
        const category = item.product_type || item.productType || item.vendor || 'Unknown';
        categories.set(category, (categories.get(category) || 0) + (item.quantity || 1));
      }
    }
    return Array.from(categories.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
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
    return Array.from(vendors.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
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
      if (value <= thresholds[0]) return 5;
      if (value <= thresholds[1]) return 4;
      if (value <= thresholds[2]) return 3;
      if (value <= thresholds[3]) return 2;
      return 1;
    } else {
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
    const customers = await this.prisma.shopifyCustomer.findMany({
      where: { merchantId },
      include: { insight: true },
    });

    const insights = customers.filter(c => c.insight).map(c => c.insight!);
    const segmentDistribution = new Map<string, number>();
    const tierDistribution = new Map<string, number>();
    const riskDistribution = new Map<string, number>();
    let totalClv = 0;
    let returningCount = 0;
    let totalHealthScore = 0;

    for (const insight of insights) {
      const segment = insight.rfmSegment || 'unknown';
      segmentDistribution.set(segment, (segmentDistribution.get(segment) || 0) + 1);
      const tier = insight.clvTier || 'unknown';
      tierDistribution.set(tier, (tierDistribution.get(tier) || 0) + 1);
      const risk = insight.churnRisk || 'unknown';
      riskDistribution.set(risk, (riskDistribution.get(risk) || 0) + 1);
      totalClv += Number(insight.projectedClv || 0);
      totalHealthScore += Number(insight.healthScore || 0);
      if (insight.isReturning) returningCount++;
    }

    return {
      totalCustomers: customers.length,
      analyzedCustomers: insights.length,
      returningCustomerRate: customers.length > 0
        ? ((returningCount / customers.length) * 100).toFixed(1) : 0,
      averageClv: insights.length > 0
        ? (totalClv / insights.length).toFixed(2) : 0,
      averageHealthScore: insights.length > 0
        ? Math.round(totalHealthScore / insights.length) : 0,
      segmentDistribution: Object.fromEntries(segmentDistribution),
      tierDistribution: Object.fromEntries(tierDistribution),
      riskDistribution: Object.fromEntries(riskDistribution),
      topChampions: insights.filter(i => i.rfmSegment === 'champions').length,
      atRiskCount: insights.filter(i => i.churnRisk === 'high' || i.churnRisk === 'critical').length,
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
    return this.prisma.shopifyCustomer.findMany({
      where: { merchantId, insight: { rfmSegment: segment } },
      include: { insight: true },
      take: limit,
      orderBy: { totalSpent: 'desc' },
    });
  }

  // ===================================================
  // GET AT-RISK CUSTOMERS
  // ===================================================
  async getAtRiskCustomers(merchantId: string, limit = 50) {
    return this.prisma.shopifyCustomer.findMany({
      where: {
        merchantId,
        insight: { churnRisk: { in: ['high', 'critical'] } },
      },
      include: { insight: true },
      take: limit,
      orderBy: { totalSpent: 'desc' },
    });
  }

  /**
   * Dittofeed Sync Engine
   * Hesaplanan metrikleri Dittofeed User Traits olarak gönderir.
   */
  async syncInsightsToDittofeed(merchantId: string) {
    const customers = await this.prisma.shopifyCustomer.findMany({
      where: { merchantId },
      include: { insight: true },
    });

    let synced = 0;
    for (const customer of customers) {
      if (!customer.insight || !customer.email) continue;

      try {
        await this.dittofeed.identifyUser(customer.id, {
          email: customer.email,
          firstName: customer.firstName || undefined,
          lastName: customer.lastName || undefined,
          predicted_clv: Number(customer.insight.projectedClv || 0),
          churn_risk_level: customer.insight.churnRisk || undefined,
          rfm_segment: customer.insight.rfmSegment || undefined,
          health_score: customer.insight.healthScore || undefined,
          days_since_last_order: customer.insight.daysSinceLastOrder || undefined,
          avg_order_interval_days: customer.insight.avgDaysBetweenOrders || undefined,
        });
        synced++;
      } catch (err) {
        this.logger.error(`Dittofeed sync error for ${customer.id}: ${err.message}`);
      }
    }

    return { synced };
  }
}
