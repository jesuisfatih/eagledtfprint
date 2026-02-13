import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Map OrderLocal to frontend-compatible format
   * Includes all enriched fields from sync
   */
  private mapOrder(order: any) {
    return {
      id: order.id,
      orderNumber: order.shopifyOrderNumber || order.shopifyOrderId?.toString() || order.id,
      shopifyOrderNumber: order.shopifyOrderNumber,
      shopifyOrderId: order.shopifyOrderId ? Number(order.shopifyOrderId) : null,
      status: this.mapFinancialToStatus(order.financialStatus),
      paymentStatus: this.mapPaymentStatus(order.financialStatus),
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus || 'unfulfilled',

      // Pricing
      totalPrice: order.totalPrice,
      subtotal: order.subtotal,
      totalTax: order.totalTax,
      totalDiscounts: order.totalDiscounts,
      totalShipping: order.totalShipping || 0,
      totalRefunded: order.totalRefunded || 0,
      currency: order.currency || 'USD',

      // Customer
      email: order.email,
      phone: order.phone,

      // Items & Addresses
      lineItems: order.lineItems,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      discountCodes: order.discountCodes,

      // Fulfillment & Tracking
      fulfillments: order.fulfillments || [],
      refunds: order.refunds || [],

      // Metadata
      notes: order.notes,
      tags: order.tags,
      riskLevel: order.riskLevel,

      // Lifecycle timestamps
      processedAt: order.processedAt,
      cancelledAt: order.cancelledAt,
      closedAt: order.closedAt,

      // Relations
      company: order.company,
      companyUser: order.companyUser,

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private mapFinancialToStatus(financialStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      authorized: 'confirmed',
      partially_paid: 'processing',
      paid: 'confirmed',
      partially_refunded: 'confirmed',
      refunded: 'cancelled',
      voided: 'cancelled',
    };
    return statusMap[financialStatus] || 'pending';
  }

  private mapPaymentStatus(financialStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      authorized: 'pending',
      partially_paid: 'pending',
      paid: 'paid',
      partially_refunded: 'refunded',
      refunded: 'refunded',
      voided: 'failed',
    };
    return statusMap[financialStatus] || 'pending';
  }

  async findAll(merchantId: string, filters?: { companyId?: string; status?: string }) {
    const where: any = { merchantId };

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters?.status) {
      where.financialStatus = filters.status;
    }

    const orders = await this.prisma.orderLocal.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        companyUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return orders.map(order => this.mapOrder(order));
  }

  async findOne(id: string, merchantId: string, companyId?: string) {
    const where: any = { id, merchantId };

    // If companyId provided, enforce it (for company users)
    if (companyId) {
      where.companyId = companyId;
    }

    const order = await this.prisma.orderLocal.findFirst({
      where,
      include: {
        company: true,
        companyUser: true,
      },
    });

    return order ? this.mapOrder(order) : null;
  }

  async getStats(merchantId: string, companyId?: string) {
    const where: any = { merchantId };

    if (companyId) {
      where.companyId = companyId;
    }

    const [total, totalRevenue, refundedCount, fulfilledCount] = await Promise.all([
      this.prisma.orderLocal.count({ where }),
      this.prisma.orderLocal.aggregate({
        where,
        _sum: { totalPrice: true, totalRefunded: true, totalShipping: true },
      }),
      this.prisma.orderLocal.count({
        where: { ...where, financialStatus: { in: ['refunded', 'partially_refunded'] } },
      }),
      this.prisma.orderLocal.count({
        where: { ...where, fulfillmentStatus: 'fulfilled' },
      }),
    ]);

    return {
      total,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      totalRefunded: totalRevenue._sum.totalRefunded || 0,
      totalShipping: totalRevenue._sum.totalShipping || 0,
      refundedCount,
      fulfilledCount,
      fulfillmentRate: total > 0 ? ((fulfilledCount / total) * 100).toFixed(1) : '0',
    };
  }
}
