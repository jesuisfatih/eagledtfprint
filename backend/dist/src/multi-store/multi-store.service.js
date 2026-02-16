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
var MultiStoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiStoreService = void 0;
const common_1 = require("@nestjs/common");
const dittofeed_admin_service_1 = require("../dittofeed/dittofeed-admin.service");
const prisma_service_1 = require("../prisma/prisma.service");
let MultiStoreService = MultiStoreService_1 = class MultiStoreService {
    prisma;
    dittofeedAdmin;
    logger = new common_1.Logger(MultiStoreService_1.name);
    constructor(prisma, dittofeedAdmin) {
        this.prisma = prisma;
        this.dittofeedAdmin = dittofeedAdmin;
    }
    async onboardNewStore(config) {
        this.logger.log(`Onboarding new store: ${config.storeName} (${config.domain})`);
        const results = {
            store: null,
            dittofeed: null,
        };
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: config.merchantId },
        });
        if (!merchant) {
            throw new Error(`Merchant ${config.merchantId} not found`);
        }
        results.store = {
            merchantId: merchant.id,
            storeName: config.storeName,
            domain: config.domain,
        };
        try {
            results.dittofeed = await this.dittofeedAdmin.setupFullStore();
        }
        catch (err) {
            this.logger.error(`Dittofeed setup failed for ${config.storeName}: ${err.message}`);
            results.dittofeed = { error: err.message };
        }
        this.logger.log(`Store onboarding complete: ${config.storeName}`);
        return results;
    }
    async getCrossStoreAnalytics() {
        const merchants = await this.prisma.merchant.findMany({
            select: {
                id: true,
                shopDomain: true,
            },
        });
        const storeAnalytics = await Promise.all(merchants.map(async (merchant) => {
            const [orders, customers, revenue] = await Promise.all([
                this.prisma.orderLocal.count({ where: { merchantId: merchant.id } }),
                this.prisma.shopifyCustomer.count({ where: { merchantId: merchant.id } }),
                this.prisma.orderLocal.aggregate({
                    where: { merchantId: merchant.id },
                    _sum: { totalPrice: true },
                    _avg: { totalPrice: true },
                }),
            ]);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const [recentRevenue, previousRevenue] = await Promise.all([
                this.prisma.orderLocal.aggregate({
                    where: {
                        merchantId: merchant.id,
                        createdAt: { gte: thirtyDaysAgo },
                    },
                    _sum: { totalPrice: true },
                }),
                this.prisma.orderLocal.aggregate({
                    where: {
                        merchantId: merchant.id,
                        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
                    },
                    _sum: { totalPrice: true },
                }),
            ]);
            const recentRev = Number(recentRevenue._sum.totalPrice || 0);
            const prevRev = Number(previousRevenue._sum.totalPrice || 0);
            const growth = prevRev > 0
                ? Math.round(((recentRev - prevRev) / prevRev) * 10000) / 100
                : 0;
            return {
                merchantId: merchant.id,
                storeName: merchant.shopDomain || 'Unknown',
                domain: merchant.shopDomain || '',
                totalRevenue: Number(revenue._sum.totalPrice || 0),
                totalOrders: orders,
                totalCustomers: customers,
                avgOrderValue: Number(revenue._avg.totalPrice || 0),
                topProduct: 'DTF Transfers',
                revenueGrowth: growth,
            };
        }));
        const totalRevenue = storeAnalytics.reduce((sum, s) => sum + s.totalRevenue, 0);
        const totalOrders = storeAnalytics.reduce((sum, s) => sum + s.totalOrders, 0);
        const totalCustomers = storeAnalytics.reduce((sum, s) => sum + s.totalCustomers, 0);
        const crossStoreCustomers = await this.getCrossStoreCustomerCount();
        return {
            stores: storeAnalytics,
            combined: {
                totalRevenue,
                totalOrders,
                totalCustomers,
                uniqueCustomers: totalCustomers - crossStoreCustomers,
                avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
            },
            crossStoreCustomers,
        };
    }
    async getCrossStoreCustomerCount() {
        try {
            const result = await this.prisma.$queryRaw `
        SELECT COUNT(*) AS count FROM (
          SELECT email
          FROM shopify_customers
          WHERE email IS NOT NULL
          GROUP BY email
          HAVING COUNT(DISTINCT merchant_id) > 1
        ) multi_store_customers
      `;
            return Number(result[0]?.count || 0);
        }
        catch {
            return 0;
        }
    }
    async getProductionLoadBalance() {
        const merchants = await this.prisma.merchant.findMany({
            select: {
                id: true,
                shopDomain: true,
            },
        });
        const storeLoads = await Promise.all(merchants.map(async (merchant) => {
            const [queuedJobs, printingJobs, printers] = await Promise.all([
                this.prisma.productionJob.count({
                    where: { merchantId: merchant.id, status: 'QUEUED' },
                }),
                this.prisma.productionJob.count({
                    where: { merchantId: merchant.id, status: 'PRINTING' },
                }),
                this.prisma.printer.findMany({
                    where: { merchantId: merchant.id, status: 'ACTIVE' },
                    select: { id: true, totalPrintsAll: true },
                }),
            ]);
            const totalActive = queuedJobs + printingJobs;
            const activePrinters = printers.length;
            const estimatedHours = activePrinters > 0
                ? Math.round((totalActive * 0.5) / activePrinters * 10) / 10
                : totalActive * 0.5;
            const dailyCapacity = activePrinters * 8;
            const utilization = dailyCapacity > 0
                ? Math.min(100, Math.round((totalActive / dailyCapacity) * 10000) / 100)
                : 0;
            return {
                merchantId: merchant.id,
                storeName: merchant.shopDomain || 'Unknown',
                queuedJobs,
                printingJobs,
                totalActive,
                estimatedHoursToComplete: estimatedHours,
                printerUtilization: utilization,
            };
        }));
        const leastBusy = storeLoads.reduce((min, s) => (s.printerUtilization < min.printerUtilization ? s : min), storeLoads[0]);
        const mostBusy = storeLoads.reduce((max, s) => (s.printerUtilization > max.printerUtilization ? s : max), storeLoads[0]);
        let recommendation = 'Load is balanced across all stores.';
        if (mostBusy && leastBusy && mostBusy.printerUtilization - leastBusy.printerUtilization > 30) {
            recommendation = `Consider routing new jobs from ${mostBusy.storeName} (${mostBusy.printerUtilization}% utilized) to ${leastBusy.storeName} (${leastBusy.printerUtilization}% utilized).`;
        }
        return {
            stores: storeLoads,
            recommendation,
        };
    }
    async getStoreConfig(merchantId) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId },
        });
        if (!merchant)
            return null;
        return {
            merchantId: merchant.id,
            storeName: merchant.shopDomain || 'DTF Store',
            domain: merchant.shopDomain || '',
            brandColor: '#2563eb',
            defaultFromEmail: `orders@${merchant.shopDomain || 'eagledtfprint.com'}`,
            features: {
                pickup: true,
                gangSheet: true,
                uvDtf: true,
                wholesale: true,
            },
        };
    }
    async listStores() {
        const merchants = await this.prisma.merchant.findMany({
            select: {
                id: true,
                shopDomain: true,
                createdAt: true,
                _count: {
                    select: {
                        orders: true,
                        customers: true,
                    },
                },
            },
        });
        return merchants.map((m) => ({
            merchantId: m.id,
            shopName: m.shopDomain,
            domain: m.shopDomain,
            createdAt: m.createdAt,
            totalOrders: m._count.orders,
            totalCustomers: m._count.customers,
        }));
    }
    async getCrossStoreCustomers(limit = 50) {
        try {
            const results = await this.prisma.$queryRaw `
        SELECT
          sc.email,
          COUNT(DISTINCT sc.merchant_id) AS store_count,
          COUNT(DISTINCT ol.id) AS total_orders,
          COALESCE(SUM(ol.total_price), 0) AS total_spent,
          STRING_AGG(DISTINCT m.shop_name, ', ') AS stores
        FROM shopify_customers sc
        LEFT JOIN order_locals ol ON ol.merchant_id = sc.merchant_id
          AND (ol.email = sc.email OR ol.customer_email = sc.email)
        LEFT JOIN merchants m ON m.id = sc.merchant_id
        WHERE sc.email IS NOT NULL
        GROUP BY sc.email
        HAVING COUNT(DISTINCT sc.merchant_id) > 1
        ORDER BY total_spent DESC
        LIMIT ${limit}
      `;
            return results.map((r) => ({
                email: r.email,
                storeCount: Number(r.store_count),
                totalOrders: Number(r.total_orders),
                totalSpent: Number(r.total_spent),
                stores: r.stores,
            }));
        }
        catch {
            return [];
        }
    }
    async getMobileFactoryDashboard(merchantId) {
        const [queuedJobs, printingJobs, readyJobs, completedToday, printers, pendingPickups,] = await Promise.all([
            this.prisma.productionJob.count({
                where: { merchantId, status: 'QUEUED' },
            }),
            this.prisma.productionJob.count({
                where: { merchantId, status: 'PRINTING' },
            }),
            this.prisma.productionJob.count({
                where: { merchantId, status: 'READY' },
            }),
            this.prisma.productionJob.count({
                where: {
                    merchantId,
                    status: 'COMPLETED',
                    completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
            }),
            this.prisma.printer.findMany({
                where: { merchantId },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    inkCyan: true,
                    inkMagenta: true,
                    inkYellow: true,
                    inkBlack: true,
                    inkWhite: true,
                },
            }),
            this.prisma.pickupOrder.count({
                where: { merchantId, status: { in: ['READY', 'ON_SHELF', 'ready', 'on_shelf'] } },
            }),
        ]);
        return {
            queue: {
                queued: queuedJobs,
                printing: printingJobs,
                ready: readyJobs,
                completedToday,
            },
            printers: printers.map((p) => ({
                id: p.id,
                name: p.name,
                status: p.status,
                inkLevels: {
                    cyan: p.inkCyan,
                    magenta: p.inkMagenta,
                    yellow: p.inkYellow,
                    black: p.inkBlack,
                    white: p.inkWhite,
                },
                lowInk: [p.inkCyan, p.inkMagenta, p.inkYellow, p.inkBlack, p.inkWhite]
                    .some((level) => (level ?? 100) < 20),
            })),
            pickup: {
                pending: pendingPickups,
            },
            timestamp: new Date().toISOString(),
        };
    }
};
exports.MultiStoreService = MultiStoreService;
exports.MultiStoreService = MultiStoreService = MultiStoreService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dittofeed_admin_service_1.DittofeedAdminService])
], MultiStoreService);
//# sourceMappingURL=multi-store.service.js.map