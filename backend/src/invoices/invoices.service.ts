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
    // Generate unique invoice number if not provided
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
        subtotal: data.subtotal,
        tax: data.tax || 0,
        totalAmount: data.totalAmount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes,
        fileUrl: data.fileUrl,
      },
      include: {
        company: true,
        companyUser: true,
      }
    });
  }

  async findAll(merchantId: string, filters: any = {}) {
    return this.prisma.invoice.findMany({
      where: {
        merchantId,
        ...(filters.companyId && { companyId: filters.companyId }),
        ...(filters.status && { status: filters.status }),
      },
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
      }
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async updateStatus(id: string, merchantId: string, status: string, amountPaid?: number) {
    return this.prisma.invoice.update({
      where: { id, merchantId },
      data: {
        status,
        ...(amountPaid !== undefined && { amountPaid }),
        ...(status === 'paid' && { paidAt: new Date() }),
      }
    });
  }

  async updateFileUrl(id: string, merchantId: string, fileUrl: string) {
    return this.prisma.invoice.update({
      where: { id, merchantId },
      data: { fileUrl },
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
