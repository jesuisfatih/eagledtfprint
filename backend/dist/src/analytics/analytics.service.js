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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats(merchantId) {
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
    async getConversionFunnel(merchantId) {
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
    async getTopProducts(merchantId, limit = 10) {
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
    async getTopCompanies(merchantId, limit = 10) {
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
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map