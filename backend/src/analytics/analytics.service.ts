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
}

