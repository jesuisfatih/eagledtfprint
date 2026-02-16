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
var MarketingScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const event_bus_service_1 = require("../event-bus/event-bus.service");
const prisma_service_1 = require("../prisma/prisma.service");
let MarketingScheduler = MarketingScheduler_1 = class MarketingScheduler {
    prisma;
    eventBus;
    logger = new common_1.Logger(MarketingScheduler_1.name);
    constructor(prisma, eventBus) {
        this.prisma = prisma;
        this.eventBus = eventBus;
    }
    async checkAbandonedCarts() {
        this.logger.debug('Checking for abandoned carts...');
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const abandonedCarts = await this.prisma.cart.findMany({
            where: {
                status: 'draft',
                convertedToOrderId: null,
                updatedAt: { lt: twoHoursAgo },
                NOT: {
                    status: 'abandoned',
                },
            },
            include: {
                items: { select: { id: true } },
            },
            take: 100,
        });
        for (const cart of abandonedCarts) {
            const minutesSinceUpdate = Math.floor((Date.now() - cart.updatedAt.getTime()) / (1000 * 60));
            await this.prisma.cart.update({
                where: { id: cart.id },
                data: { status: 'abandoned' },
            });
            await this.eventBus.cartAbandoned({
                merchantId: cart.merchantId,
                cartId: cart.id,
                companyUserId: cart.createdByUserId || undefined,
                companyId: cart.companyId || undefined,
                total: Number(cart.total || 0),
                itemCount: cart.items.length,
                abandonedMinutes: minutesSinceUpdate,
            });
        }
        if (abandonedCarts.length > 0) {
            this.logger.log(`Detected ${abandonedCarts.length} abandoned carts`);
        }
    }
    async checkAbandonedDesigns() {
        this.logger.debug('Checking for abandoned designs...');
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const abandonedDesigns = await this.prisma.designProject.findMany({
            where: {
                status: 'draft',
                createdAt: { lt: fortyEightHoursAgo },
                lastEditedAt: null,
            },
            take: 50,
        });
        const stalledDesigns = await this.prisma.designProject.findMany({
            where: {
                status: 'in_progress',
                lastEditedAt: { lt: fortyEightHoursAgo },
            },
            take: 50,
        });
        const allAbandoned = [...abandonedDesigns, ...stalledDesigns];
        for (const design of allAbandoned) {
            const hoursInactive = Math.floor((Date.now() - (design.lastEditedAt || design.createdAt).getTime()) / (1000 * 60 * 60));
            await this.eventBus.designAbandoned({
                merchantId: design.merchantId,
                designProjectId: design.id,
                orderId: design.orderId || undefined,
                companyUserId: design.companyUserId || undefined,
                companyId: design.companyId || undefined,
                hoursInactive,
            });
        }
        if (allAbandoned.length > 0) {
            this.logger.log(`Detected ${allAbandoned.length} abandoned designs`);
        }
    }
    async checkChurnRisks() {
        this.logger.debug('Checking for churn risks...');
        const merchants = await this.prisma.merchant.findMany({
            where: { status: 'active' },
            select: { id: true },
        });
        for (const merchant of merchants) {
            const highRiskIntels = await this.prisma.companyIntelligence.findMany({
                where: {
                    merchantId: merchant.id,
                    churnRisk: { gte: 70 },
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            users: { select: { id: true }, take: 1 },
                        },
                    },
                },
            });
            for (const intel of highRiskIntels) {
                if (!intel.company.users[0])
                    continue;
                await this.eventBus.churnRiskDetected({
                    merchantId: merchant.id,
                    companyId: intel.company.id,
                    companyUserId: intel.company.users[0].id,
                    companyName: intel.company.name,
                    healthScore: Number(intel.engagementScore || 0),
                    churnRisk: Number(intel.churnRisk) >= 85 ? 'critical' : 'high',
                    daysSinceLastOrder: intel.daysSinceLastOrder || 0,
                });
            }
            if (highRiskIntels.length > 0) {
                this.logger.log(`Detected ${highRiskIntels.length} high-risk companies for merchant ${merchant.id}`);
            }
        }
    }
};
exports.MarketingScheduler = MarketingScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketingScheduler.prototype, "checkAbandonedCarts", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_2_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketingScheduler.prototype, "checkAbandonedDesigns", null);
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketingScheduler.prototype, "checkChurnRisks", null);
exports.MarketingScheduler = MarketingScheduler = MarketingScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], MarketingScheduler);
//# sourceMappingURL=marketing.scheduler.js.map