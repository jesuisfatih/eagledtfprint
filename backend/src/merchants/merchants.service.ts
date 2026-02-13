import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.merchant.findUnique({
      where: { id },
    });
  }

  async updateSettings(id: string, settings: any) {
    return this.prisma.merchant.update({
      where: { id },
      data: {
        settings,
        updatedAt: new Date(),
      },
    });
  }

  async toggleSnippet(id: string, enabled: boolean) {
    return this.prisma.merchant.update({
      where: { id },
      data: { snippetEnabled: enabled },
    });
  }

  async getStats(id: string) {
    const [
      totalCompanies,
      totalUsers,
      totalOrders,
      totalRevenue,
      totalProducts,
    ] = await Promise.all([
      this.prisma.company.count({ where: { merchantId: id } }),
      this.prisma.companyUser.count({
        where: { company: { merchantId: id } },
      }),
      this.prisma.orderLocal.count({ where: { merchantId: id } }),
      this.prisma.orderLocal.aggregate({
        where: { merchantId: id },
        _sum: { totalPrice: true },
      }),
      this.prisma.catalogProduct.count({ where: { merchantId: id } }),
    ]);

    const revenue = totalRevenue._sum.totalPrice || 0;
    const avgOrderValue = totalOrders > 0 ? Number(revenue) / totalOrders : 0;

    return {
      totalCompanies,
      totalUsers,
      totalOrders,
      totalRevenue: revenue,
      totalProducts,
      avgOrderValue,
    };
  }
}
