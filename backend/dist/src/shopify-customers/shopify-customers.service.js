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
exports.ShopifyCustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ShopifyCustomersService = class ShopifyCustomersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(merchantId, filters) {
        const where = { merchantId };
        if (filters?.search) {
            where.OR = [
                { email: { contains: filters.search, mode: 'insensitive' } },
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { tags: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        if (filters?.segment) {
            where.insight = { ...(where.insight || {}), rfmSegment: filters.segment };
        }
        if (filters?.churnRisk) {
            where.insight = { ...(where.insight || {}), churnRisk: filters.churnRisk };
        }
        if (filters?.clvTier) {
            where.insight = { ...(where.insight || {}), clvTier: filters.clvTier };
        }
        const customers = await this.prisma.shopifyCustomer.findMany({
            where,
            include: {
                insight: true,
            },
            orderBy: { syncedAt: 'desc' },
            take: 1000,
        });
        return customers.map((c) => ({
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
    async findOne(id) {
        const customer = await this.prisma.shopifyCustomer.findUnique({
            where: { id },
            include: {
                insight: true,
                proactiveOffers: {
                    where: { status: { in: ['active', 'accepted'] } },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!customer)
            return null;
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
            proactiveOffers: customer.proactiveOffers?.map((o) => ({
                ...o,
                discountValue: o.discountValue ? Number(o.discountValue) : null,
                minimumOrderAmount: o.minimumOrderAmount ? Number(o.minimumOrderAmount) : null,
                resultRevenue: o.resultRevenue ? Number(o.resultRevenue) : null,
            })) || [],
        };
    }
    async convertToCompany(customerId, merchantId) {
        const customer = await this.prisma.shopifyCustomer.findUnique({
            where: { id: customerId },
        });
        if (!customer) {
            throw new Error('Customer not found');
        }
        const existingCompany = await this.prisma.company.findFirst({
            where: {
                merchantId,
                createdByShopifyCustomerId: customer.shopifyCustomerId,
            },
        });
        if (existingCompany) {
            throw new Error('This customer is already converted to a B2B company');
        }
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
        const companyUser = await this.prisma.companyUser.create({
            data: {
                companyId: company.id,
                shopifyCustomerId: customer.shopifyCustomerId,
                email: customer.email || '',
                firstName: customer.firstName,
                lastName: customer.lastName,
                role: 'admin',
                isActive: false,
            },
        });
        return {
            company,
            companyUser,
        };
    }
};
exports.ShopifyCustomersService = ShopifyCustomersService;
exports.ShopifyCustomersService = ShopifyCustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShopifyCustomersService);
//# sourceMappingURL=shopify-customers.service.js.map