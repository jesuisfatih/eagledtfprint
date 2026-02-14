import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyService } from '../shopify/shopify.service';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private shopifyService: ShopifyService,
  ) {}

  async createInvoice(merchantId: string, data: any) {
    const invoiceNumber = data.invoiceNumber || `INV-${Date.now()}`;

    return this.prisma.invoice.create({
      data: {
        merchantId,
        companyId: data.companyId,
        companyUserId: data.companyUserId,
        orderId: data.orderId,
        quoteId: data.quoteId,
        invoiceNumber,
        status: data.status || 'unpaid',
        currency: data.currency || 'USD',
        subtotal: data.subtotal ? parseFloat(data.subtotal.toString()) : 0,
        tax: data.tax ? parseFloat(data.tax.toString()) : 0,
        totalAmount: data.totalAmount ? parseFloat(data.totalAmount.toString()) : 0,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes,
        fileUrl: data.fileUrl,
      },
      include: {
        company: true,
        companyUser: true,
      },
    });
  }

  async findAll(merchantId: string, filters: any = {}) {
    const where: any = { merchantId };
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { company: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        company: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, merchantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, merchantId },
      include: {
        company: true,
        companyUser: true,
        order: true,
        quote: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async updateStatus(id: string, merchantId: string, status: string, amountPaid?: number) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, merchantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const updateData: any = { status };
    if (amountPaid !== undefined) updateData.amountPaid = amountPaid;
    if (status === 'paid') {
      updateData.paidAt = new Date();
      updateData.amountPaid = Number(invoice.totalAmount);
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { company: true },
    });
  }

  async updateFileUrl(id: string, merchantId: string, fileUrl: string) {
    return this.prisma.invoice.update({
      where: { id, merchantId },
      data: { fileUrl },
    });
  }

  // ===================================================
  // INVOICE STATISTICS
  // ===================================================
  async getStatistics(merchantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { merchantId },
      include: { company: true },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let paidCount = 0;
    let recentPaid = 0;

    const companyStats = new Map<string, { name: string; total: number; paid: number; pending: number; count: number }>();

    for (const inv of invoices) {
      const amount = Number(inv.totalAmount || 0);
      const paid = Number(inv.amountPaid || 0);
      totalInvoiced += amount;
      totalPaid += paid;

      if (inv.status === 'paid') {
        paidCount++;
        if (inv.paidAt && new Date(inv.paidAt) >= thirtyDaysAgo) {
          recentPaid += amount;
        }
      } else {
        totalPending += (amount - paid);
        if (inv.dueDate && new Date(inv.dueDate) < now && inv.status !== 'void') {
          totalOverdue += (amount - paid);
          overdueCount++;
        }
      }

      // Company breakdown
      const companyName = inv.company?.name || 'Unknown';
      const companyId = inv.companyId;
      if (!companyStats.has(companyId)) {
        companyStats.set(companyId, { name: companyName, total: 0, paid: 0, pending: 0, count: 0 });
      }
      const cs = companyStats.get(companyId)!;
      cs.total += amount;
      cs.paid += paid;
      cs.pending += (amount - paid);
      cs.count++;
    }

    const topCompanies = Array.from(companyStats.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      totalCount: invoices.length,
      paidCount,
      overdueCount,
      recentPaid30d: Math.round(recentPaid * 100) / 100,
      collectionRate: totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0,
      topCompanies,
    };
  }

  // ===================================================
  // AUTO-DETECT OVERDUE
  // ===================================================
  async markOverdueInvoices(merchantId: string) {
    const now = new Date();
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        merchantId,
        status: { in: ['unpaid', 'partial'] },
        dueDate: { lt: now },
      },
    });

    let updated = 0;
    for (const inv of overdueInvoices) {
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: { status: 'overdue' },
      });
      updated++;
    }

    return { updated };
  }

  // ===================================================
  // RECORD PARTIAL PAYMENT
  // ===================================================
  async recordPayment(id: string, merchantId: string, amount: number) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, merchantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const newAmountPaid = Number(invoice.amountPaid || 0) + amount;
    const totalAmount = Number(invoice.totalAmount || 0);

    let status = 'partial';
    let paidAt: Date | null = null;
    if (newAmountPaid >= totalAmount) {
      status = 'paid';
      paidAt = new Date();
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        status,
        ...(paidAt && { paidAt }),
      },
      include: { company: true },
    });
  }

  // ===================================================
  // DUPLICATE INVOICE
  // ===================================================
  async duplicateInvoice(id: string, merchantId: string) {
    const original = await this.prisma.invoice.findFirst({ where: { id, merchantId } });
    if (!original) throw new NotFoundException('Invoice not found');

    return this.prisma.invoice.create({
      data: {
        merchantId,
        companyId: original.companyId,
        companyUserId: original.companyUserId,
        invoiceNumber: `INV-${Date.now()}`,
        status: 'unpaid',
        currency: original.currency,
        subtotal: original.subtotal,
        tax: original.tax,
        totalAmount: original.totalAmount,
        amountPaid: 0,
        notes: original.notes ? `[Copy] ${original.notes}` : '[Copy]',
      },
      include: { company: true },
    });
  }

  // Get invoices for a specific company (for Accounts panel)
  async getCompanyInvoices(companyId: string) {
    return this.prisma.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
