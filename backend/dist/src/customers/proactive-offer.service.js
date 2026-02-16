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
var ProactiveOfferService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProactiveOfferService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const customer_intelligence_service_1 = require("./customer-intelligence.service");
const OFFER_STRATEGIES = {
    win_back: {
        name: 'Win-Back Campaign',
        description: 'Re-engage customers who haven\'t ordered recently',
        targetSegments: ['at_risk', 'hibernating', 'about_to_sleep'],
        targetChurnRisk: ['high', 'critical'],
        minDaysSinceLastOrder: 60,
        minOrders: 2,
        discountType: 'percentage',
        discountRange: { min: 15, max: 30 },
        validHours: 72,
        channel: 'email',
        maxOffersPerDay: 10,
        cooldownDays: 30,
    },
    loyalty_reward: {
        name: 'Loyalty Reward',
        description: 'Reward loyal customers with exclusive offers',
        targetSegments: ['champions', 'loyal'],
        targetClvTier: ['platinum', 'gold'],
        minOrders: 5,
        discountType: 'percentage',
        discountRange: { min: 10, max: 20 },
        validHours: 168,
        channel: 'email',
        maxOffersPerDay: 5,
        cooldownDays: 45,
    },
    upsell: {
        name: 'Upsell Incentive',
        description: 'Encourage higher-value purchases',
        targetSegments: ['potential_loyalist', 'promising', 'new_customers'],
        targetClvTier: ['silver', 'bronze'],
        minOrders: 1,
        discountType: 'percentage',
        discountRange: { min: 5, max: 15 },
        validHours: 48,
        channel: 'email',
        maxOffersPerDay: 10,
        cooldownDays: 14,
    },
    reactivation: {
        name: 'Customer Reactivation',
        description: 'Bring back lost customers with aggressive offers',
        targetSegments: ['lost', 'cant_lose'],
        targetChurnRisk: ['critical'],
        minDaysSinceLastOrder: 120,
        minOrders: 1,
        discountType: 'percentage',
        discountRange: { min: 25, max: 40 },
        validHours: 120,
        channel: 'email',
        maxOffersPerDay: 5,
        cooldownDays: 60,
    },
    volume_incentive: {
        name: 'Volume Incentive',
        description: 'Encourage larger orders with minimum spend discount',
        targetSegments: ['loyal', 'potential_loyalist', 'need_attention'],
        minOrders: 3,
        discountType: 'fixed_amount',
        discountRange: { min: 10, max: 50 },
        validHours: 96,
        channel: 'email',
        maxOffersPerDay: 8,
        cooldownDays: 21,
    },
    first_purchase_followup: {
        name: 'First Purchase Follow-up',
        description: 'Encourage second purchase after first order',
        targetSegments: ['new_customers'],
        minOrders: 1,
        maxDaysSinceLastOrder: 30,
        discountType: 'percentage',
        discountRange: { min: 10, max: 15 },
        validHours: 168,
        channel: 'email',
        maxOffersPerDay: 15,
        cooldownDays: 14,
    },
    declining_trend: {
        name: 'Declining Trend Intervention',
        description: 'Intervene when order frequency is declining',
        targetSegments: ['need_attention', 'about_to_sleep'],
        targetChurnRisk: ['medium', 'high'],
        minOrders: 3,
        discountType: 'percentage',
        discountRange: { min: 10, max: 20 },
        validHours: 96,
        channel: 'email',
        maxOffersPerDay: 8,
        cooldownDays: 21,
    },
    high_value_retention: {
        name: 'High-Value Retention',
        description: 'Retain highest-spending customers proactively',
        targetClvTier: ['platinum'],
        targetSegments: ['champions', 'loyal', 'cant_lose'],
        minOrders: 5,
        discountType: 'percentage',
        discountRange: { min: 5, max: 15 },
        validHours: 336,
        channel: 'email',
        maxOffersPerDay: 3,
        cooldownDays: 60,
    },
    free_shipping_nudge: {
        name: 'Free Shipping Nudge',
        description: 'Offer free shipping to encourage conversion',
        targetSegments: ['promising', 'new_customers', 'potential_loyalist'],
        targetChurnRisk: ['medium'],
        minOrders: 1,
        discountType: 'free_shipping',
        discountRange: { min: 0, max: 0 },
        validHours: 48,
        channel: 'email',
        maxOffersPerDay: 15,
        cooldownDays: 14,
    },
    anniversary: {
        name: 'Customer Anniversary',
        description: 'Celebrate customer relationship milestones',
        targetSegments: ['champions', 'loyal', 'potential_loyalist'],
        minOrders: 2,
        discountType: 'percentage',
        discountRange: { min: 15, max: 25 },
        validHours: 168,
        channel: 'email',
        maxOffersPerDay: 5,
        cooldownDays: 365,
    },
};
let ProactiveOfferService = ProactiveOfferService_1 = class ProactiveOfferService {
    prisma;
    customerIntelligence;
    logger = new common_1.Logger(ProactiveOfferService_1.name);
    constructor(prisma, customerIntelligence) {
        this.prisma = prisma;
        this.customerIntelligence = customerIntelligence;
    }
    async generateOffers(merchantId) {
        this.logger.log(`Generating proactive offers for merchant: ${merchantId}`);
        const strategies = {};
        let totalGenerated = 0;
        const customers = await this.prisma.shopifyCustomer.findMany({
            where: { merchantId },
            include: { insight: true },
        });
        for (const [strategyKey, strategy] of Object.entries(OFFER_STRATEGIES)) {
            try {
                const count = await this.processStrategy(merchantId, strategyKey, strategy, customers);
                strategies[strategyKey] = count;
                totalGenerated += count;
            }
            catch (error) {
                this.logger.warn(`Strategy ${strategyKey} failed: ${error.message}`);
                strategies[strategyKey] = 0;
            }
        }
        this.logger.log(`Generated ${totalGenerated} proactive offers.`);
        return { generated: totalGenerated, strategies };
    }
    async processStrategy(merchantId, strategyKey, strategy, customers) {
        let generated = 0;
        const eligible = customers.filter((customer) => {
            const insight = customer.insight;
            if (!insight)
                return false;
            if (strategy.targetSegments.length > 0 &&
                !strategy.targetSegments.includes(insight.rfmSegment)) {
                return false;
            }
            if (strategy.targetChurnRisk?.length &&
                !strategy.targetChurnRisk.includes(insight.churnRisk)) {
                return false;
            }
            if (strategy.targetClvTier?.length &&
                !strategy.targetClvTier.includes(insight.clvTier)) {
                return false;
            }
            if (strategy.minOrders &&
                (customer.ordersCount || 0) < strategy.minOrders) {
                return false;
            }
            if (strategy.minDaysSinceLastOrder &&
                (insight.daysSinceLastOrder || 0) < strategy.minDaysSinceLastOrder) {
                return false;
            }
            if (strategy.maxDaysSinceLastOrder &&
                (insight.daysSinceLastOrder || 999) > strategy.maxDaysSinceLastOrder) {
                return false;
            }
            return true;
        });
        const toProcess = eligible.slice(0, strategy.maxOffersPerDay);
        for (const customer of toProcess) {
            try {
                const recentOffer = await this.prisma.proactiveOffer.findFirst({
                    where: {
                        shopifyCustomerId: customer.id,
                        strategy: strategyKey,
                        createdAt: {
                            gte: new Date(Date.now() - strategy.cooldownDays * 24 * 60 * 60 * 1000),
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                });
                if (recentOffer)
                    continue;
                const discountValue = this.calculateDiscountValue(customer, strategy);
                const discountCode = this.generateCode(strategyKey);
                const minimumOrderAmount = strategyKey === 'volume_incentive'
                    ? this.calculateMinimumOrder(customer)
                    : null;
                const message = this.generateMessage(strategyKey, customer, discountValue, strategy.discountType);
                await this.prisma.proactiveOffer.create({
                    data: {
                        merchantId,
                        shopifyCustomerId: customer.id,
                        strategy: strategyKey,
                        triggerReason: strategy.description,
                        discountType: strategy.discountType,
                        discountValue,
                        discountCode,
                        minimumOrderAmount,
                        title: strategy.name,
                        message,
                        suggestedProducts: this.getSuggestedProducts(customer),
                        channel: strategy.channel,
                        status: 'active',
                        expiresAt: new Date(Date.now() + strategy.validHours * 60 * 60 * 1000),
                    },
                });
                generated++;
            }
            catch (error) {
                this.logger.warn(`Failed to create offer for customer ${customer.id}: ${error.message}`);
            }
        }
        return generated;
    }
    calculateDiscountValue(customer, strategy) {
        if (strategy.discountType === 'free_shipping')
            return 0;
        const insight = customer.insight;
        const clvTier = insight?.clvTier || 'bronze';
        const { min, max } = strategy.discountRange;
        const tierMultiplier = {
            platinum: 0.9,
            gold: 0.7,
            silver: 0.4,
            bronze: 0.2,
        };
        const multiplier = tierMultiplier[clvTier] || 0.2;
        const discountValue = Math.round(min + (max - min) * multiplier);
        return discountValue;
    }
    calculateMinimumOrder(customer) {
        const avgOrderValue = Number(customer.insight?.avgOrderValue || 50);
        return Math.round(avgOrderValue * 1.5);
    }
    generateCode(strategy) {
        const prefix = strategy.toUpperCase().slice(0, 4);
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `EAGLE-${prefix}-${random}`;
    }
    generateMessage(strategy, customer, discountValue, discountType) {
        const firstName = customer.firstName || 'Valued Customer';
        const discountLabel = discountType === 'percentage'
            ? `${discountValue}%`
            : discountType === 'free_shipping'
                ? 'Free Shipping'
                : `$${discountValue}`;
        const messages = {
            win_back: `Hi ${firstName}! We miss you! Come back and enjoy ${discountLabel} off your next order. We've got great new products waiting for you.`,
            loyalty_reward: `${firstName}, thank you for being an amazing customer! As a token of our appreciation, here's ${discountLabel} off — enjoy!`,
            upsell: `${firstName}, here's a special offer just for you: ${discountLabel} off your next order. Discover our latest products!`,
            reactivation: `${firstName}, it's been a while! We'd love to welcome you back with ${discountLabel} off. Let's reconnect!`,
            volume_incentive: `${firstName}, unlock ${discountLabel} off with your next big order! The more you shop, the more you save.`,
            first_purchase_followup: `${firstName}, thanks for your first order! Here's ${discountLabel} off to make your next experience even better.`,
            declining_trend: `${firstName}, we noticed it's been a while. Here's ${discountLabel} off to brighten your day!`,
            high_value_retention: `${firstName}, as one of our most valued customers, enjoy an exclusive ${discountLabel} off. You deserve it!`,
            free_shipping_nudge: `${firstName}, enjoy FREE SHIPPING on your next order! No minimum purchase required.`,
            anniversary: `Happy Anniversary, ${firstName}! To celebrate our time together, here's ${discountLabel} off. Thank you for being with us!`,
        };
        return messages[strategy] || `${firstName}, enjoy ${discountLabel} off your next order!`;
    }
    getSuggestedProducts(customer) {
        const insight = customer.insight;
        if (!insight)
            return [];
        const categories = Array.isArray(insight.preferredCategories)
            ? insight.preferredCategories.slice(0, 3)
            : [];
        return categories;
    }
    async getCustomerOffers(customerId) {
        return this.prisma.proactiveOffer.findMany({
            where: {
                shopifyCustomerId: customerId,
                status: 'active',
                expiresAt: { gte: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getMerchantOffers(merchantId, filters) {
        const where = { merchantId };
        if (filters?.status)
            where.status = filters.status;
        if (filters?.strategy)
            where.strategy = filters.strategy;
        const [offers, total] = await Promise.all([
            this.prisma.proactiveOffer.findMany({
                where,
                include: {
                    shopifyCustomer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
            }),
            this.prisma.proactiveOffer.count({ where }),
        ]);
        return { offers, total };
    }
    async getOfferAnalytics(merchantId) {
        const allOffers = await this.prisma.proactiveOffer.findMany({
            where: { merchantId },
        });
        const now = new Date();
        const byStrategy = {};
        let totalSent = 0;
        let totalAccepted = 0;
        let totalExpired = 0;
        let totalRevenue = 0;
        for (const offer of allOffers) {
            if (!byStrategy[offer.strategy]) {
                byStrategy[offer.strategy] = { sent: 0, accepted: 0, expired: 0, revenue: 0 };
            }
            totalSent++;
            byStrategy[offer.strategy].sent++;
            if (offer.status === 'accepted' || offer.redeemedAt) {
                totalAccepted++;
                byStrategy[offer.strategy].accepted++;
            }
            if (offer.status === 'expired' || (offer.expiresAt < now && offer.status === 'active')) {
                totalExpired++;
                byStrategy[offer.strategy].expired++;
            }
            const revenue = Number(offer.resultRevenue || 0);
            totalRevenue += revenue;
            byStrategy[offer.strategy].revenue += revenue;
        }
        return {
            totalSent,
            totalAccepted,
            totalExpired,
            totalRevenue,
            conversionRate: totalSent > 0 ? ((totalAccepted / totalSent) * 100).toFixed(1) : '0',
            avgRevenuePerAccepted: totalAccepted > 0 ? (totalRevenue / totalAccepted).toFixed(2) : '0',
            byStrategy,
            activeOffers: allOffers.filter(o => o.status === 'active' && o.expiresAt > now).length,
        };
    }
    async markViewed(offerId) {
        return this.prisma.proactiveOffer.update({
            where: { id: offerId },
            data: { viewedAt: new Date() },
        });
    }
    async markAccepted(offerId) {
        return this.prisma.proactiveOffer.update({
            where: { id: offerId },
            data: {
                status: 'accepted',
                acceptedAt: new Date(),
            },
        });
    }
    async markRedeemed(offerId, orderId, revenue) {
        return this.prisma.proactiveOffer.update({
            where: { id: offerId },
            data: {
                redeemedAt: new Date(),
                resultOrderId: orderId,
                resultRevenue: revenue,
            },
        });
    }
    async expireOldOffers(merchantId) {
        const result = await this.prisma.proactiveOffer.updateMany({
            where: {
                merchantId,
                status: 'active',
                expiresAt: { lt: new Date() },
            },
            data: {
                status: 'expired',
                expiredAt: new Date(),
            },
        });
        if (result.count > 0) {
            this.logger.log(`Expired ${result.count} offers for merchant ${merchantId}`);
        }
        return result.count;
    }
    async cancelOffer(offerId) {
        return this.prisma.proactiveOffer.update({
            where: { id: offerId },
            data: { status: 'cancelled' },
        });
    }
};
exports.ProactiveOfferService = ProactiveOfferService;
exports.ProactiveOfferService = ProactiveOfferService = ProactiveOfferService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        customer_intelligence_service_1.CustomerIntelligenceService])
], ProactiveOfferService);
//# sourceMappingURL=proactive-offer.service.js.map