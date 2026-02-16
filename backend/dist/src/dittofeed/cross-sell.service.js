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
var CrossSellService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossSellService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const dittofeed_service_1 = require("../dittofeed/dittofeed.service");
const prisma_service_1 = require("../prisma/prisma.service");
const SUPPLY_CONSUMPTION_RATES = {
    dtf_ink: { avgDaysPerUnit: 45, reorderLeadDays: 7, category: 'ink' },
    dtf_ink_set: { avgDaysPerUnit: 45, reorderLeadDays: 7, category: 'ink' },
    dtf_film: { avgDaysPerUnit: 18, reorderLeadDays: 5, category: 'film' },
    dtf_film_roll: { avgDaysPerUnit: 18, reorderLeadDays: 5, category: 'film' },
    transfer_powder: { avgDaysPerUnit: 35, reorderLeadDays: 5, category: 'powder' },
    dtf_powder: { avgDaysPerUnit: 35, reorderLeadDays: 5, category: 'powder' },
    cleaning_solution: { avgDaysPerUnit: 90, reorderLeadDays: 10, category: 'cleaning' },
};
const CROSS_SELL_RULES = [
    {
        name: 'by_size_to_gang_sheet',
        condition: (t) => t.favorite_product_type === 'by_size' &&
            t.total_orders >= 3 &&
            !t.gang_sheet_fill_rate,
        recommendation: 'You could save up to 40% by switching to Gang Sheets! Upload multiple designs on one sheet.',
        event: 'cross_sell_gang_sheet',
        priority: 1,
    },
    {
        name: 'dtf_to_uv_dtf',
        condition: (t) => t.preferred_transfer_type === 'dtf' &&
            t.total_orders >= 5 &&
            !t.has_ordered_uv_dtf,
        recommendation: 'Try our UV DTF Stickers! Perfect for hard surfaces — cups, phone cases, tumblers.',
        event: 'cross_sell_uv_dtf',
        priority: 2,
    },
    {
        name: 'standard_to_specialty',
        condition: (t) => t.preferred_transfer_type === 'dtf' &&
            t.total_orders >= 8 &&
            !t.has_ordered_glitter &&
            !t.has_ordered_glow,
        recommendation: 'Make your designs POP! Try our Glitter DTF or Glow-in-the-Dark transfers.',
        event: 'cross_sell_specialty',
        priority: 3,
    },
    {
        name: 'volume_discount_nudge',
        condition: (t) => t.total_orders >= 10 &&
            t.avg_order_value < 100 &&
            !t.is_wholesale,
        recommendation: 'You qualify for wholesale pricing! Apply now and save 15-25% on every order.',
        event: 'cross_sell_wholesale',
        priority: 2,
    },
    {
        name: 'supply_bundle',
        condition: (t) => t.is_supply_buyer &&
            t.supply_types?.length === 1,
        recommendation: 'Bundle and save! Get 10% off when you order Ink + Film + Powder together.',
        event: 'cross_sell_supply_bundle',
        priority: 4,
    },
    {
        name: 'transfer_to_supply',
        condition: (t) => t.total_orders >= 20 &&
            t.total_spent > 2000 &&
            !t.is_supply_buyer,
        recommendation: 'Ready to print in-house? We carry DTF printers, ink, film, and all the supplies you need.',
        event: 'cross_sell_supplies',
        priority: 5,
    },
];
let CrossSellService = CrossSellService_1 = class CrossSellService {
    prisma;
    dittofeedService;
    logger = new common_1.Logger(CrossSellService_1.name);
    constructor(prisma, dittofeedService) {
        this.prisma = prisma;
        this.dittofeedService = dittofeedService;
    }
    async checkSupplyReorders() {
        try {
            const merchants = await this.prisma.merchant.findMany({
                where: { status: 'active' },
                select: { id: true, shopDomain: true },
            });
            for (const merchant of merchants) {
                await this.checkMerchantSupplyReorders(merchant.id);
            }
        }
        catch (err) {
            this.logger.error(`Supply reorder check failed: ${err.message}`);
        }
    }
    async checkMerchantSupplyReorders(merchantId) {
        const supplyOrders = await this.prisma.orderLocal.findMany({
            where: {
                merchantId,
                financialStatus: 'paid',
            },
            select: {
                id: true,
                shopifyCustomerId: true,
                companyUserId: true,
                email: true,
                lineItems: true,
                processedAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const customerSupplyHistory = new Map();
        for (const order of supplyOrders) {
            const userId = order.companyUserId;
            if (!userId || !order.email)
                continue;
            const lineItems = order.lineItems || [];
            for (const item of lineItems) {
                const supplyCategory = this.detectSupplyCategory(item);
                if (!supplyCategory)
                    continue;
                if (!customerSupplyHistory.has(userId)) {
                    customerSupplyHistory.set(userId, {
                        email: order.email,
                        userId,
                        purchases: [],
                    });
                }
                customerSupplyHistory.get(userId).purchases.push({
                    category: supplyCategory,
                    purchasedAt: order.processedAt || order.createdAt,
                    productTitle: item.title || '',
                });
            }
        }
        let alertsSent = 0;
        for (const [userId, history] of customerSupplyHistory) {
            const byCategory = new Map();
            for (const p of history.purchases) {
                if (!byCategory.has(p.category)) {
                    byCategory.set(p.category, []);
                }
                byCategory.get(p.category).push(p.purchasedAt);
            }
            for (const [category, dates] of byCategory) {
                const sortedDates = dates.sort((a, b) => b.getTime() - a.getTime());
                const lastPurchase = sortedDates[0];
                let avgDays;
                if (sortedDates.length >= 2) {
                    const intervals = [];
                    for (let i = 0; i < sortedDates.length - 1; i++) {
                        const diff = (sortedDates[i].getTime() - sortedDates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
                        intervals.push(diff);
                    }
                    avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                }
                else {
                    const rate = this.getConsumptionRate(category);
                    avgDays = rate?.avgDaysPerUnit || 30;
                }
                const daysSinceLastPurchase = (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
                const daysUntilEmpty = avgDays - daysSinceLastPurchase;
                const rate = this.getConsumptionRate(category);
                const leadDays = rate?.reorderLeadDays || 7;
                if (daysUntilEmpty <= leadDays && daysUntilEmpty > -7) {
                    try {
                        await this.dittofeedService.trackEvent(userId, 'supply_running_low', {
                            category,
                            daysUntilEmpty: Math.max(0, Math.round(daysUntilEmpty)),
                            lastPurchaseDate: lastPurchase.toISOString(),
                            estimatedEmptyDate: new Date(lastPurchase.getTime() + avgDays * 24 * 60 * 60 * 1000).toISOString(),
                            avgReorderDays: Math.round(avgDays),
                        });
                        await this.dittofeedService.identifyUser(userId, {
                            estimated_supply_reorder_date: new Date(Date.now() + Math.max(0, daysUntilEmpty) * 24 * 60 * 60 * 1000).toISOString(),
                            is_supply_buyer: true,
                        });
                        alertsSent++;
                    }
                    catch (err) {
                        this.logger.warn(`Supply alert failed for ${userId}: ${err.message}`);
                    }
                }
            }
        }
        if (alertsSent > 0) {
            this.logger.log(`Supply reorder alerts sent: ${alertsSent} for merchant ${merchantId}`);
        }
        return { alertsSent };
    }
    async runCrossSellAnalysis() {
        try {
            const merchants = await this.prisma.merchant.findMany({
                where: { status: 'active' },
                select: { id: true },
            });
            for (const merchant of merchants) {
                await this.analyzeMerchantCrossSell(merchant.id);
            }
        }
        catch (err) {
            this.logger.error(`Cross-sell analysis failed: ${err.message}`);
        }
    }
    async analyzeMerchantCrossSell(merchantId) {
        const syncs = await this.prisma.marketingSync.findMany({
            where: {
                merchantId,
                entityType: 'user',
                syncStatus: 'synced',
                lastTraits: { not: null },
            },
            select: {
                entityId: true,
                dittofeedUserId: true,
                lastTraits: true,
            },
        });
        let eventsSent = 0;
        for (const sync of syncs) {
            const traits = sync.lastTraits;
            if (!traits || !sync.dittofeedUserId)
                continue;
            const matchedRules = CROSS_SELL_RULES
                .filter((rule) => {
                try {
                    return rule.condition(traits);
                }
                catch {
                    return false;
                }
            })
                .sort((a, b) => a.priority - b.priority);
            if (matchedRules.length > 0) {
                const topRule = matchedRules[0];
                try {
                    await this.dittofeedService.trackEvent(sync.dittofeedUserId, topRule.event, {
                        ruleName: topRule.name,
                        recommendation: topRule.recommendation,
                        priority: topRule.priority,
                        matchedRules: matchedRules.map((r) => r.name),
                    });
                    await this.dittofeedService.identifyUser(sync.dittofeedUserId, {
                        cross_sell_opportunity: topRule.name,
                        cross_sell_recommendation: topRule.recommendation,
                    });
                    eventsSent++;
                }
                catch (err) {
                    this.logger.warn(`Cross-sell event failed for ${sync.dittofeedUserId}: ${err.message}`);
                }
            }
        }
        if (eventsSent > 0) {
            this.logger.log(`Cross-sell events sent: ${eventsSent} for merchant ${merchantId}`);
        }
        return { eventsSent };
    }
    async getRecommendationsForUser(userId) {
        const sync = await this.prisma.marketingSync.findFirst({
            where: {
                dittofeedUserId: userId,
                entityType: 'user',
            },
            select: { lastTraits: true },
        });
        const traits = sync?.lastTraits || {};
        const recommendations = [];
        for (const rule of CROSS_SELL_RULES) {
            try {
                if (rule.condition(traits)) {
                    recommendations.push({
                        type: rule.name,
                        title: rule.recommendation,
                        reason: `Based on your ${traits.total_orders || 0} orders`,
                        discount: rule.priority <= 2 ? '10% OFF' : undefined,
                    });
                }
            }
            catch {
            }
        }
        if (traits.last_gang_sheet_size && traits.avg_gang_sheet_fill_rate > 0.9) {
            recommendations.push({
                type: 'size_upgrade',
                title: 'Your gang sheets are nearly full! Upgrade to a larger size for better value.',
                reason: `Your average fill rate is ${Math.round((traits.avg_gang_sheet_fill_rate || 0) * 100)}%`,
            });
        }
        return recommendations.sort((a, b) => {
            const ruleA = CROSS_SELL_RULES.find((r) => r.name === a.type);
            const ruleB = CROSS_SELL_RULES.find((r) => r.name === b.type);
            return (ruleA?.priority || 99) - (ruleB?.priority || 99);
        });
    }
    detectSupplyCategory(lineItem) {
        const title = (lineItem.title || '').toLowerCase();
        if (title.includes('ink') || title.includes('mürekkep'))
            return 'ink';
        if (title.includes('film') || title.includes('roll'))
            return 'film';
        if (title.includes('powder') || title.includes('toz'))
            return 'powder';
        if (title.includes('cleaning') || title.includes('temizleme') || title.includes('solution'))
            return 'cleaning';
        const productType = (lineItem.product_type || '').toLowerCase();
        if (productType.includes('supply') || productType.includes('supplies')) {
            if (title.includes('ink'))
                return 'ink';
            if (title.includes('film'))
                return 'film';
            if (title.includes('powder'))
                return 'powder';
            return 'other_supply';
        }
        return null;
    }
    getConsumptionRate(category) {
        const exactMatch = Object.entries(SUPPLY_CONSUMPTION_RATES).find(([key, val]) => key === category || val.category === category);
        return exactMatch ? exactMatch[1] : null;
    }
};
exports.CrossSellService = CrossSellService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_NOON),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrossSellService.prototype, "checkSupplyReorders", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_WEEK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrossSellService.prototype, "runCrossSellAnalysis", null);
exports.CrossSellService = CrossSellService = CrossSellService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dittofeed_service_1.DittofeedService])
], CrossSellService);
//# sourceMappingURL=cross-sell.service.js.map