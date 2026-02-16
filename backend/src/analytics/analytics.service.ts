import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(merchantId: string) {
    const [companies, users, orders, events, revenue] = await Promise.all([
      this.prisma.company.count({ where: { merchantId } }),
      this.prisma.companyUser.count({ where: { company: { merchantId } } }),
      this.prisma.orderLocal.count({ where: { merchantId } }),
      this.prisma.activityLog.count({ where: { merchantId } }),
      this.prisma.orderLocal.aggregate({
        where: { merchantId },
        _sum: { totalPrice: true },
      }),
    ]);

    return {
      totalCompanies: companies,
      totalUsers: users,
      totalOrders: orders,
      totalEvents: events,
      totalRevenue: revenue._sum.totalPrice || 0,
    };
  }

  async getConversionFunnel(merchantId: string) {
    const [productViews, addToCarts, checkouts, orders] = await Promise.all([
      this.prisma.activityLog.count({
        where: { merchantId, eventType: 'product_view' },
      }),
      this.prisma.activityLog.count({
        where: { merchantId, eventType: 'add_to_cart' },
      }),
      this.prisma.activityLog.count({
        where: { merchantId, eventType: 'checkout_start' },
      }),
      this.prisma.orderLocal.count({ where: { merchantId } }),
    ]);

    return {
      steps: [
        { name: 'Product Views', count: productViews },
        { name: 'Add to Cart', count: addToCarts },
        { name: 'Checkouts', count: checkouts },
        { name: 'Orders', count: orders },
      ],
      conversionRate: productViews > 0 ? ((orders / productViews) * 100).toFixed(2) : 0,
    };
  }

  async getTopProducts(merchantId: string, limit = 10) {
    const productViews = await this.prisma.activityLog.groupBy({
      by: ['shopifyProductId'],
      where: {
        merchantId,
        eventType: 'product_view',
        shopifyProductId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return productViews;
  }

  async getTopCompanies(merchantId: string, limit = 10) {
    const companies = await this.prisma.company.findMany({
      where: { merchantId },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
        orders: {
          select: {
            totalPrice: true,
          },
        },
      },
      take: limit,
    });

    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      orderCount: c._count.orders,
      totalSpent: c.orders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0),
    }));
  }

  /**
   * Order Profitability Engine (Phase 4)
   * Bir siparişin kargo, malzeme ve net kar analizini yapar.
   */
  async getOrderProfitability(orderId: string) {
    const order = await this.prisma.orderLocal.findUnique({
      where: { id: orderId },
      include: { productionJobs: true },
    });

    if (!order) return null;

    const revenue = Number(order.totalPrice || 0);
    const shippingCost = Number(order.totalShipping || 0); // Varsayılan maliyet olarak alıyoruz

    let materialCost = 0;
    for (const job of order.productionJobs) {
      if (!job.areaSquareInch) continue;

      const filmCost = (job.areaSquareInch / 144) * 1.25; // $1.25 per sqft
      const inkCost = (job.areaSquareInch / 1550) * 15 * 0.10; // $0.10 per ml, ~15ml per m2
      materialCost += filmCost + inkCost + 0.50; // +$0.50 powder/misc
    }

    const netProfit = revenue - shippingCost - materialCost;

    return {
      orderNumber: order.shopifyOrderNumber,
      revenue,
      costs: {
        shipping: shippingCost,
        material: Math.round(materialCost * 100) / 100,
        labor: 0, // Manual input potentially
      },
      netProfit: Math.round(netProfit * 100) / 100,
      margin: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
    };
  }

  /**
   * Operator Leaderboard (Phase 4)
   * En çalışkan ve en verimli operatörleri listeler.
   */
  async getOperatorLeaderboard(merchantId: string) {
    const jobs = await this.prisma.productionJob.findMany({
      where: {
        merchantId,
        status: 'COMPLETED',
        operatorId: { not: null },
      },
      select: {
        operatorId: true,
        operatorName: true,
        areaSquareInch: true,
        qcResult: true,
      },
    });

    const stats = new Map<string, any>();

    for (const job of jobs) {
      const opId = job.operatorId!;
      if (!stats.has(opId)) {
        stats.set(opId, { name: job.operatorName, completedCount: 0, totalSqInch: 0, failCount: 0 });
      }
      const entry = stats.get(opId);
      entry.completedCount++;
      entry.totalSqInch += job.areaSquareInch || 0;
      if (job.qcResult === 'fail') entry.failCount++;
    }

    return Array.from(stats.values())
      .map(s => ({
        ...s,
        totalSqFt: Math.round((s.totalSqInch / 144) * 10) / 10,
        efficiency: s.completedCount > 0 ? Math.round(((s.completedCount - s.failCount) / s.completedCount) * 100) : 0
      }))
      .sort((a, b) => b.totalSqFt - a.totalSqFt);
  }
}
