import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopifyCustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(merchantId: string, filters?: { search?: string; segment?: string; churnRisk?: string; clvTier?: string }) {
    const where: any = { merchantId };

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { tags: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filter by customer insight segment
    if (filters?.segment) {
      where.insight = { ...(where.insight || {}), rfmSegment: filters.segment };
    }

    // Filter by churn risk
    if (filters?.churnRisk) {
      where.insight = { ...(where.insight || {}), churnRisk: filters.churnRisk };
    }

    // Filter by CLV tier
    if (filters?.clvTier) {
      where.insight = { ...(where.insight || {}), clvTier: filters.clvTier };
    }

    const customers = await this.prisma.shopifyCustomer.findMany({
      where,
      include: {
        insight: true,
      } as any,
      orderBy: { syncedAt: 'desc' },
      take: 1000,
    });

    // Convert BigInt to string for JSON serialization
    return customers.map((c: any) => ({
      ...c,
      shopifyCustomerId: c.shopifyCustomerId.toString(),
      lastOrderId: c.lastOrderId?.toString() || null,
      insight: c.insight ? {
        ...c.insight,
        clvScore: c.insight.clvScore ? Number(c.insight.clvScore) : null,
        projectedClv: c.insight.projectedClv ? Number(c.insight.projectedClv) : null,
        avgOrderValue: c.insight.avgOrderValue ? Number(c.insight.avgOrderValue) : null,
        maxOrderValue: c.insight.maxOrderValue ? Number(c.insight.maxOrderValue) : null,
      } : null,
    }));
  }

  async findOne(id: string) {
    const customer: any = await this.prisma.shopifyCustomer.findUnique({
      where: { id },
      include: {
        insight: true,
        proactiveOffers: {
          where: { status: { in: ['active', 'accepted'] } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      } as any,
    });

    if (!customer) return null;

    return {
      ...customer,
      shopifyCustomerId: customer.shopifyCustomerId.toString(),
      lastOrderId: customer.lastOrderId?.toString() || null,
      insight: customer.insight ? {
        ...customer.insight,
        clvScore: customer.insight.clvScore ? Number(customer.insight.clvScore) : null,
        projectedClv: customer.insight.projectedClv ? Number(customer.insight.projectedClv) : null,
        avgOrderValue: customer.insight.avgOrderValue ? Number(customer.insight.avgOrderValue) : null,
        maxOrderValue: customer.insight.maxOrderValue ? Number(customer.insight.maxOrderValue) : null,
      } : null,
      proactiveOffers: (customer as any).proactiveOffers?.map((o: any) => ({
        ...o,
        discountValue: o.discountValue ? Number(o.discountValue) : null,
        minimumOrderAmount: o.minimumOrderAmount ? Number(o.minimumOrderAmount) : null,
        resultRevenue: o.resultRevenue ? Number(o.resultRevenue) : null,
      })) || [],
    };
  }

  async convertToCompany(customerId: string, merchantId: string) {
    const customer = await this.prisma.shopifyCustomer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Check if already converted
    const existingCompany = await this.prisma.company.findFirst({
      where: {
        merchantId,
        createdByShopifyCustomerId: customer.shopifyCustomerId,
      },
    });

    if (existingCompany) {
      throw new Error('This customer is already converted to a B2B company');
    }

    // Create company
    const company = await this.prisma.company.create({
      data: {
        merchantId,
        name: `${customer.firstName} ${customer.lastName}`.trim() || customer.email || 'New Company',
        email: customer.email,
        phone: customer.phone,
        status: 'pending',
        createdByShopifyCustomerId: customer.shopifyCustomerId,
      },
    });

    // Create admin user for company
    const companyUser = await this.prisma.companyUser.create({
      data: {
        companyId: company.id,
        shopifyCustomerId: customer.shopifyCustomerId,
        email: customer.email || '',
        firstName: customer.firstName,
        lastName: customer.lastName,
        role: 'admin',
        isActive: false, // Will be activated on invitation accept
      },
    });

    return {
      company,
      companyUser,
    };
  }
}
