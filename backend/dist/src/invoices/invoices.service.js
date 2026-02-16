"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const shopify_service_1 = require("../shopify/shopify.service");
let InvoiceService = class InvoiceService {
    prisma;
    shopifyService;
    constructor(prisma, shopifyService) {
        this.prisma = prisma;
        this.shopifyService = shopifyService;
    }
    async createInvoice(merchantId, data) {
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
    async findAll(merchantId, filters = {}) {
        const where = { merchantId };
        if (filters.companyId)
            where.companyId = filters.companyId;
        if (filters.status)
            where.status = filters.status;
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
    async findOne(id, merchantId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, merchantId },
            include: {
                company: true,
                companyUser: true,
                order: true,
                quote: true,
            },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        return invoice;
    }
    async updateStatus(id, merchantId, status, amountPaid) {
        const invoice = await this.prisma.invoice.findFirst({ where: { id, merchantId } });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        const updateData = { status };
        if (amountPaid !== undefined)
            updateData.amountPaid = amountPaid;
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
    async updateFileUrl(id, merchantId, fileUrl) {
        return this.prisma.invoice.update({
            where: { id, merchantId },
            data: { fileUrl },
        });
    }
    async getStatistics(merchantId) {
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
        const companyStats = new Map();
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
            }
            else {
                totalPending += (amount - paid);
                if (inv.dueDate && new Date(inv.dueDate) < now && inv.status !== 'void') {
                    totalOverdue += (amount - paid);
                    overdueCount++;
                }
            }
            const companyName = inv.company?.name || 'Unknown';
            const companyId = inv.companyId;
            if (!companyStats.has(companyId)) {
                companyStats.set(companyId, { name: companyName, total: 0, paid: 0, pending: 0, count: 0 });
            }
            const cs = companyStats.get(companyId);
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
    async markOverdueInvoices(merchantId) {
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
    async recordPayment(id, merchantId, amount) {
        const invoice = await this.prisma.invoice.findFirst({ where: { id, merchantId } });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        const newAmountPaid = Number(invoice.amountPaid || 0) + amount;
        const totalAmount = Number(invoice.totalAmount || 0);
        let status = 'partial';
        let paidAt = null;
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
    async duplicateInvoice(id, merchantId) {
        const original = await this.prisma.invoice.findFirst({ where: { id, merchantId } });
        if (!original)
            throw new common_1.NotFoundException('Invoice not found');
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
    async getCompanyInvoices(companyId) {
        return this.prisma.invoice.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_service_1.ShopifyService])
], InvoiceService);
//# sourceMappingURL=invoices.service.js.map