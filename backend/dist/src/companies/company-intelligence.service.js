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
var CompanyIntelligenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyIntelligenceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CompanyIntelligenceService = CompanyIntelligenceService_1 = class CompanyIntelligenceService {
    prisma;
    logger = new common_1.Logger(CompanyIntelligenceService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateAll(merchantId) {
        const companies = await this.prisma.company.findMany({
            where: { merchantId },
            include: {
                users: { select: { id: true, shopifyCustomerId: true } },
            },
        });
        let processed = 0;
        for (const company of companies) {
            try {
                await this.calculateForCompany(merchantId, company);
                processed++;
            }
            catch (err) {
                this.logger.warn(`Failed to calculate intelligence for company ${company.id}: ${err.message}`);
            }
        }
        this.logger.log(`Calculated intelligence for ${processed}/${companies.length} companies`);
        return { processed, total: companies.length };
    }
    async calculateForCompany(merchantId, company) {
        const companyId = company.id;
        const userIds = company.users?.map((u) => u.id) || [];
        const sessions = await this.prisma.visitorSession.findMany({
            where: { merchantId, companyId },
            orderBy: { startedAt: 'desc' },
        });
        const orders = await this.prisma.orderLocal.findMany({
            where: { merchantId, companyId },
            orderBy: { createdAt: 'asc' },
        });
        const carts = userIds.length > 0
            ? await this.prisma.cart.findMany({
                where: { merchantId, companyId },
                include: { items: { take: 10 } },
            })
            : [];
        const totalSessions = sessions.length;
        const totalPageViews = sessions.reduce((s, ss) => s + ss.pageViews, 0);
        const totalProductViews = sessions.reduce((s, ss) => s + ss.productViews, 0);
        const totalAddToCarts = sessions.reduce((s, ss) => s + ss.addToCarts, 0);
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const avgSessionDuration = totalSessions > 0
            ? Math.round(sessions.reduce((s, ss) => s + ss.durationSeconds, 0) / totalSessions)
            : 0;
        const uniqueFingerprints = new Set(sessions.map(s => s.fingerprintId));
        const totalVisitors = uniqueFingerprints.size;
        const engagementScore = Math.min(100, Math.round((Math.min(totalSessions, 50) / 50 * 20) +
            (Math.min(totalPageViews, 200) / 200 * 15) +
            (Math.min(totalProductViews, 100) / 100 * 15) +
            (Math.min(totalAddToCarts, 30) / 30 * 15) +
            (Math.min(totalOrders, 20) / 20 * 20) +
            (Math.min(totalRevenue, 10000) / 10000 * 15)));
        let buyerIntent = 'cold';
        if (totalOrders >= 5 && totalRevenue >= 5000)
            buyerIntent = 'champion';
        else if (totalOrders >= 3)
            buyerIntent = 'hot';
        else if (totalAddToCarts >= 3 || totalOrders >= 1)
            buyerIntent = 'warm';
        else if (totalProductViews >= 5)
            buyerIntent = 'interested';
        const now = new Date();
        const lastOrder = orders.length > 0 ? orders[orders.length - 1] : null;
        const daysSinceLastOrder = lastOrder
            ? Math.floor((now.getTime() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : null;
        let segment = 'new';
        if (totalOrders === 0)
            segment = 'prospect';
        else if (daysSinceLastOrder !== null && daysSinceLastOrder > 180)
            segment = 'churned';
        else if (daysSinceLastOrder !== null && daysSinceLastOrder > 90)
            segment = 'at_risk';
        else if (totalOrders >= 5)
            segment = 'loyal';
        else if (totalOrders >= 2)
            segment = 'active';
        let orderFrequencyDays = null;
        if (orders.length >= 2) {
            const firstOrderDate = new Date(orders[0].createdAt);
            const lastOrderDate = new Date(orders[orders.length - 1].createdAt);
            const daySpan = Math.floor((lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24));
            orderFrequencyDays = Math.round(daySpan / (orders.length - 1));
        }
        const productViewCounts = new Map();
        for (const order of orders) {
            const items = Array.isArray(order.lineItems) ? order.lineItems : [];
            for (const item of items) {
                const key = item.product_id || item.title || 'unknown';
                const existing = productViewCounts.get(key);
                if (existing) {
                    existing.count += item.quantity || 1;
                }
                else {
                    productViewCounts.set(key, { title: item.title || item.product_title || key, count: item.quantity || 1 });
                }
            }
        }
        const topPurchasedProducts = [...productViewCounts.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([id, data]) => ({ id, ...data }));
        let churnRisk = 0;
        if (daysSinceLastOrder !== null) {
            if (daysSinceLastOrder > 180)
                churnRisk = 0.9;
            else if (daysSinceLastOrder > 90)
                churnRisk = 0.7;
            else if (daysSinceLastOrder > 60)
                churnRisk = 0.4;
            else if (daysSinceLastOrder > 30)
                churnRisk = 0.2;
            else
                churnRisk = 0.05;
        }
        else if (totalOrders === 0) {
            churnRisk = 0.5;
        }
        const upsellPotential = Math.min(1, (engagementScore / 100) * (1 - churnRisk) * (totalOrders > 0 ? 1.2 : 0.5));
        const lastActiveAt = sessions.length > 0 ? sessions[0].lastActivityAt : null;
        await this.prisma.companyIntelligence.upsert({
            where: { companyId },
            create: {
                merchantId,
                companyId,
                totalVisitors,
                totalSessions,
                totalPageViews,
                totalProductViews,
                totalAddToCarts,
                totalOrders,
                totalRevenue,
                avgSessionDuration,
                avgOrderValue,
                engagementScore,
                buyerIntent,
                segment,
                topPurchasedProducts,
                lastActiveAt,
                firstOrderAt: orders.length > 0 ? new Date(orders[0].createdAt) : null,
                lastOrderAt: lastOrder ? new Date(lastOrder.createdAt) : null,
                daysSinceLastOrder,
                orderFrequencyDays,
                churnRisk,
                upsellPotential,
            },
            update: {
                totalVisitors,
                totalSessions,
                totalPageViews,
                totalProductViews,
                totalAddToCarts,
                totalOrders,
                totalRevenue,
                avgSessionDuration,
                avgOrderValue,
                engagementScore,
                buyerIntent,
                segment,
                topPurchasedProducts,
                lastActiveAt,
                firstOrderAt: orders.length > 0 ? new Date(orders[0].createdAt) : null,
                lastOrderAt: lastOrder ? new Date(lastOrder.createdAt) : null,
                daysSinceLastOrder,
                orderFrequencyDays,
                churnRisk,
                upsellPotential,
            },
        });
        return { companyId, engagementScore, segment, buyerIntent };
    }
    async getDashboard(merchantId) {
        const intelligence = await this.prisma.companyIntelligence.findMany({
            where: { merchantId },
            include: {
                company: {
                    select: { id: true, name: true, email: true, status: true },
                },
            },
            orderBy: { engagementScore: 'desc' },
        });
        const segmentDist = {};
        const intentDist = {};
        let totalRevenue = 0;
        let totalOrders = 0;
        let activeCompanies = 0;
        for (const ci of intelligence) {
            segmentDist[ci.segment] = (segmentDist[ci.segment] || 0) + 1;
            intentDist[ci.buyerIntent] = (intentDist[ci.buyerIntent] || 0) + 1;
            totalRevenue += Number(ci.totalRevenue);
            totalOrders += ci.totalOrders;
            if (ci.engagementScore > 20)
                activeCompanies++;
        }
        const topByRevenue = [...intelligence]
            .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
            .slice(0, 10)
            .map(ci => ({
            id: ci.companyId,
            name: ci.company.name,
            revenue: Number(ci.totalRevenue),
            orders: ci.totalOrders,
            engagementScore: ci.engagementScore,
            segment: ci.segment,
            buyerIntent: ci.buyerIntent,
            churnRisk: ci.churnRisk,
            lastOrderAt: ci.lastOrderAt,
        }));
        const atRisk = intelligence
            .filter(ci => ci.churnRisk > 0.5 && ci.totalOrders > 0)
            .sort((a, b) => b.churnRisk - a.churnRisk)
            .slice(0, 10)
            .map(ci => ({
            id: ci.companyId,
            name: ci.company.name,
            churnRisk: ci.churnRisk,
            daysSinceLastOrder: ci.daysSinceLastOrder,
            totalRevenue: Number(ci.totalRevenue),
            segment: ci.segment,
        }));
        const growthCompanies = intelligence
            .filter(ci => ci.segment === 'active' || ci.segment === 'new' || ci.segment === 'prospect')
            .filter(ci => ci.engagementScore > 30)
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, 10)
            .map(ci => ({
            id: ci.companyId,
            name: ci.company.name,
            engagementScore: ci.engagementScore,
            buyerIntent: ci.buyerIntent,
            totalProductViews: ci.totalProductViews,
            totalAddToCarts: ci.totalAddToCarts,
            upsellPotential: ci.upsellPotential,
        }));
        return {
            summary: {
                totalCompanies: intelligence.length,
                activeCompanies,
                totalRevenue,
                totalOrders,
                avgRevenuePerCompany: intelligence.length > 0 ? Math.round(totalRevenue / intelligence.length) : 0,
                avgOrdersPerCompany: intelligence.length > 0 ? Math.round(totalOrders / intelligence.length) : 0,
            },
            segmentDistribution: segmentDist,
            intentDistribution: intentDist,
            topByRevenue,
            atRisk,
            growthCompanies,
            allCompanies: intelligence.map(ci => ({
                id: ci.companyId,
                name: ci.company.name,
                email: ci.company.email,
                status: ci.company.status,
                engagementScore: ci.engagementScore,
                buyerIntent: ci.buyerIntent,
                segment: ci.segment,
                totalOrders: ci.totalOrders,
                totalRevenue: Number(ci.totalRevenue),
                avgOrderValue: Number(ci.avgOrderValue),
                churnRisk: ci.churnRisk,
                upsellPotential: ci.upsellPotential,
                daysSinceLastOrder: ci.daysSinceLastOrder,
                lastActiveAt: ci.lastActiveAt,
                lastOrderAt: ci.lastOrderAt,
            })),
        };
    }
    async getCompanyDetail(merchantId, companyId) {
        const [intel, orders, sessions, carts] = await Promise.all([
            this.prisma.companyIntelligence.findFirst({ where: { merchantId, companyId } }),
            this.prisma.orderLocal.findMany({
                where: { merchantId, companyId },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            this.prisma.visitorSession.findMany({
                where: { merchantId, companyId },
                orderBy: { startedAt: 'desc' },
                take: 20,
            }),
            this.prisma.cart.findMany({
                where: { merchantId, companyId },
                include: { items: { take: 10 } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);
        const now = new Date();
        const monthlyRevenue = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const monthOrders = orders.filter(o => new Date(o.createdAt) >= monthStart && new Date(o.createdAt) <= monthEnd);
            monthlyRevenue.push({
                month: monthStart.toISOString().slice(0, 7),
                revenue: monthOrders.reduce((s, o) => s + Number(o.totalPrice || 0), 0),
                orders: monthOrders.length,
            });
        }
        const userActivity = await this.prisma.visitorSession.groupBy({
            by: ['companyUserId'],
            where: { merchantId, companyId, companyUserId: { not: null } },
            _count: true,
            _sum: { pageViews: true, productViews: true, addToCarts: true, durationSeconds: true },
        });
        return {
            intelligence: intel,
            recentOrders: orders.slice(0, 10).map(o => ({
                id: o.id,
                orderNumber: o.shopifyOrderNumber,
                totalPrice: o.totalPrice,
                financialStatus: o.financialStatus,
                fulfillmentStatus: o.fulfillmentStatus,
                createdAt: o.createdAt,
            })),
            recentSessions: sessions.slice(0, 10).map(s => ({
                id: s.id,
                pageViews: s.pageViews,
                productViews: s.productViews,
                duration: s.durationSeconds,
                landingPage: s.landingPage,
                startedAt: s.startedAt,
            })),
            monthlyRevenue,
            userActivity,
            cartActivity: {
                total: carts.length,
                draft: carts.filter(c => c.status === 'draft').length,
                submitted: carts.filter(c => c.status === 'submitted').length,
                converted: carts.filter(c => c.convertedAt).length,
            },
        };
    }
};
exports.CompanyIntelligenceService = CompanyIntelligenceService;
exports.CompanyIntelligenceService = CompanyIntelligenceService = CompanyIntelligenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompanyIntelligenceService);
//# sourceMappingURL=company-intelligence.service.js.map