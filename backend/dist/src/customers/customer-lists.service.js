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
var CustomerListsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerListsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CustomerListsService = CustomerListsService_1 = class CustomerListsService {
    prisma;
    logger = new common_1.Logger(CustomerListsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    getAlarmDefinitions() {
        return [
            {
                systemType: 'churn_alarm',
                name: '🚨 Churn Alarm — About to Lose',
                description: 'Customers with high/critical churn risk who haven\'t ordered recently & have significant spend history',
                color: '#ef4444',
                icon: 'alert-triangle',
                priority: 1,
                filter: (c) => {
                    const dm = c.insight?.deepMetrics;
                    const risk = c.insight?.churnRisk;
                    return (risk === 'high' || risk === 'critical') &&
                        Number(c.totalSpent || 0) > 100 &&
                        (dm?.churnProbability >= 60 || c.insight?.daysSinceLastOrder > 45);
                },
            },
            {
                systemType: 'attention_needed',
                name: '⚠️ Needs Attention — Slowing Down',
                description: 'Previously active customers whose order frequency is declining or spending is dropping',
                color: '#f59e0b',
                icon: 'eye',
                priority: 2,
                filter: (c) => {
                    const dm = c.insight?.deepMetrics;
                    if (!dm)
                        return false;
                    return (c.insight?.rfmSegment === 'need_attention' ||
                        c.insight?.rfmSegment === 'about_to_sleep') &&
                        c.ordersCount >= 2;
                },
            },
            {
                systemType: 'dormant_whales',
                name: '💤 Dormant Whales — High-Value Sleepers',
                description: 'Big spenders who haven\'t ordered in a while — huge reactivation potential',
                color: '#8b5cf6',
                icon: 'diamond',
                priority: 3,
                filter: (c) => {
                    const dm = c.insight?.deepMetrics;
                    return dm?.isDormantHighValue === true ||
                        (Number(c.totalSpent || 0) > 500 &&
                            c.insight?.daysSinceLastOrder > 60 &&
                            c.ordersCount >= 3);
                },
            },
            {
                systemType: 'frequency_drop',
                name: '📉 Frequency Drop — Ordering Less',
                description: 'Customers whose order frequency has significantly declined compared to their usual pattern',
                color: '#f97316',
                icon: 'chart-arrows',
                priority: 4,
                filter: (c) => {
                    const dm = c.insight?.deepMetrics;
                    if (!dm || c.ordersCount < 3)
                        return false;
                    return dm.orderGrowthRate < -30 || dm.engagementVelocity === 'declining';
                },
            },
            {
                systemType: 'rising_stars',
                name: '🚀 Rising Stars — Growing Fast',
                description: 'New or mid-tier customers showing rapid growth in orders and spending',
                color: '#3b82f6',
                icon: 'rocket',
                priority: 5,
                filter: (c) => {
                    const dm = c.insight?.deepMetrics;
                    return dm?.isRisingStar === true ||
                        (dm?.spendingGrowthRate > 50 && dm?.orderGrowthRate > 30);
                },
            },
            {
                systemType: 'vip_candidates',
                name: '🌟 VIP Candidates — Ready to Upgrade',
                description: 'Customers showing elite-level metrics who could be upgraded to VIP status',
                color: '#eab308',
                icon: 'crown',
                priority: 6,
                filter: (c) => {
                    const dm = c.insight?.deepMetrics;
                    return dm?.isVipCandidate === true;
                },
            },
            {
                systemType: 'comeback_window',
                name: '⏰ Comeback Window — Act Now',
                description: 'Customers within their predicted reactivation window — perfect timing for outreach',
                color: '#06b6d4',
                icon: 'clock',
                priority: 7,
                filter: (c) => {
                    const dm = c.insight?.deepMetrics;
                    if (!dm || !dm.predictedNextOrderDays)
                        return false;
                    const daysSince = c.insight?.daysSinceLastOrder || 0;
                    const predicted = dm.predictedNextOrderDays;
                    return daysSince >= predicted && daysSince <= predicted + 7;
                },
            },
            {
                systemType: 'discount_sensitive',
                name: '🏷️ Discount Responsive — Offer Driven',
                description: 'Customers who primarily buy with discounts — perfect targets for promotions',
                color: '#10b981',
                icon: 'discount-2',
                priority: 8,
                filter: (c) => {
                    const dm = c.insight?.deepMetrics;
                    return dm?.discountUsageRate > 60 && c.ordersCount >= 2;
                },
            },
        ];
    }
    async generateSmartAlarms(merchantId) {
        this.logger.log(`Generating smart alarms for merchant: ${merchantId}`);
        const customers = await this.prisma.shopifyCustomer.findMany({
            where: { merchantId },
            include: { insight: true },
        });
        const definitions = this.getAlarmDefinitions();
        const results = [];
        for (const def of definitions) {
            const matchingCustomers = customers.filter(c => {
                try {
                    return def.filter(c);
                }
                catch {
                    return false;
                }
            });
            if (matchingCustomers.length === 0)
                continue;
            let list = await this.prisma.customerList.findFirst({
                where: { merchantId, isSystem: true, systemType: def.systemType },
            });
            if (!list) {
                list = await this.prisma.customerList.create({
                    data: {
                        merchantId,
                        name: def.name,
                        description: def.description,
                        color: def.color,
                        icon: def.icon,
                        isSystem: true,
                        systemType: def.systemType,
                    },
                });
            }
            else {
                await this.prisma.customerList.update({
                    where: { id: list.id },
                    data: { name: def.name, description: def.description, color: def.color, icon: def.icon },
                });
            }
            await this.prisma.customerListItem.deleteMany({ where: { listId: list.id } });
            const toAdd = matchingCustomers.slice(0, 1000);
            for (const customer of toAdd) {
                await this.prisma.customerListItem.create({
                    data: {
                        listId: list.id,
                        shopifyCustomerId: customer.id,
                    },
                });
            }
            results.push({
                systemType: def.systemType,
                name: def.name,
                count: toAdd.length,
                priority: def.priority,
                color: def.color,
                icon: def.icon,
            });
        }
        const systemLists = await this.prisma.customerList.findMany({
            where: { merchantId, isSystem: true },
            include: { _count: { select: { items: true } } },
        });
        for (const sl of systemLists) {
            if (sl._count.items === 0) {
                await this.prisma.customerList.delete({ where: { id: sl.id } });
            }
        }
        return {
            generated: results.length,
            alarms: results.sort((a, b) => a.priority - b.priority),
        };
    }
    async findAllLists(merchantId) {
        const lists = await this.prisma.customerList.findMany({
            where: { merchantId },
            include: {
                _count: { select: { items: true } },
            },
            orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
        });
        return lists.map(l => ({
            ...l,
            customerCount: l._count.items,
        }));
    }
    async getListWithCustomers(listId, merchantId) {
        const list = await this.prisma.customerList.findFirst({
            where: { id: listId, merchantId },
            include: {
                items: {
                    include: {
                        shopifyCustomer: {
                            include: { insight: true },
                        },
                    },
                    orderBy: { addedAt: 'desc' },
                    take: 1000,
                },
                _count: { select: { items: true } },
            },
        });
        if (!list)
            throw new common_1.NotFoundException('List not found');
        return {
            ...list,
            customerCount: list._count.items,
            items: list.items.map(item => ({
                ...item,
                shopifyCustomer: {
                    ...item.shopifyCustomer,
                    shopifyCustomerId: item.shopifyCustomer.shopifyCustomerId.toString(),
                    lastOrderId: item.shopifyCustomer.lastOrderId?.toString() || null,
                    insight: item.shopifyCustomer.insight ? {
                        ...item.shopifyCustomer.insight,
                        clvScore: item.shopifyCustomer.insight.clvScore ? Number(item.shopifyCustomer.insight.clvScore) : null,
                        projectedClv: item.shopifyCustomer.insight.projectedClv ? Number(item.shopifyCustomer.insight.projectedClv) : null,
                        avgOrderValue: item.shopifyCustomer.insight.avgOrderValue ? Number(item.shopifyCustomer.insight.avgOrderValue) : null,
                        maxOrderValue: item.shopifyCustomer.insight.maxOrderValue ? Number(item.shopifyCustomer.insight.maxOrderValue) : null,
                    } : null,
                },
            })),
        };
    }
    async createList(merchantId, data) {
        return this.prisma.customerList.create({
            data: {
                merchantId,
                name: data.name,
                description: data.description,
                color: data.color || '#3b82f6',
                icon: data.icon || 'list',
                isSystem: false,
            },
        });
    }
    async updateList(listId, merchantId, data) {
        const list = await this.prisma.customerList.findFirst({
            where: { id: listId, merchantId, isSystem: false },
        });
        if (!list)
            throw new common_1.NotFoundException('List not found or is a system list');
        return this.prisma.customerList.update({
            where: { id: listId },
            data,
        });
    }
    async deleteList(listId, merchantId) {
        const list = await this.prisma.customerList.findFirst({
            where: { id: listId, merchantId, isSystem: false },
        });
        if (!list)
            throw new common_1.NotFoundException('List not found or is a system list');
        await this.prisma.customerList.delete({ where: { id: listId } });
        return { deleted: true };
    }
    async addCustomersToList(listId, merchantId, customerIds, notes) {
        const list = await this.prisma.customerList.findFirst({
            where: { id: listId, merchantId },
        });
        if (!list)
            throw new common_1.NotFoundException('List not found');
        const ids = customerIds.slice(0, 1000);
        let added = 0;
        for (const customerId of ids) {
            try {
                await this.prisma.customerListItem.create({
                    data: {
                        listId,
                        shopifyCustomerId: customerId,
                        notes,
                    },
                });
                added++;
            }
            catch {
            }
        }
        return { added, listId };
    }
    async removeCustomersFromList(listId, merchantId, customerIds) {
        const list = await this.prisma.customerList.findFirst({
            where: { id: listId, merchantId },
        });
        if (!list)
            throw new common_1.NotFoundException('List not found');
        const result = await this.prisma.customerListItem.deleteMany({
            where: {
                listId,
                shopifyCustomerId: { in: customerIds },
            },
        });
        return { removed: result.count };
    }
    async updateItemNote(itemId, notes) {
        return this.prisma.customerListItem.update({
            where: { id: itemId },
            data: { notes },
        });
    }
    async getAlarmSummary(merchantId) {
        const systemLists = await this.prisma.customerList.findMany({
            where: { merchantId, isSystem: true },
            include: {
                _count: { select: { items: true } },
                items: {
                    take: 5,
                    include: {
                        shopifyCustomer: {
                            include: { insight: true },
                        },
                    },
                    orderBy: { addedAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return systemLists.map(list => ({
            id: list.id,
            systemType: list.systemType,
            name: list.name,
            description: list.description,
            color: list.color,
            icon: list.icon,
            customerCount: list._count.items,
            preview: list.items.map(item => ({
                id: item.shopifyCustomer.id,
                name: `${item.shopifyCustomer.firstName || ''} ${item.shopifyCustomer.lastName || ''}`.trim(),
                email: item.shopifyCustomer.email,
                totalSpent: Number(item.shopifyCustomer.totalSpent || 0),
                ordersCount: item.shopifyCustomer.ordersCount,
                daysSinceLastOrder: item.shopifyCustomer.insight?.daysSinceLastOrder,
                churnRisk: item.shopifyCustomer.insight?.churnRisk,
            })),
        }));
    }
};
exports.CustomerListsService = CustomerListsService;
exports.CustomerListsService = CustomerListsService = CustomerListsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomerListsService);
//# sourceMappingURL=customer-lists.service.js.map