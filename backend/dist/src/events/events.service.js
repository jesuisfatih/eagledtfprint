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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EventsService = EventsService_1 = class EventsService {
    prisma;
    eventsQueue;
    logger = new common_1.Logger(EventsService_1.name);
    constructor(prisma, eventsQueue) {
        this.prisma = prisma;
        this.eventsQueue = eventsQueue;
    }
    async collectEvent(dto) {
        await this.eventsQueue.add('process-event', dto);
        return { success: true };
    }
    async getEventsByCompany(companyId, filters) {
        return this.prisma.activityLog.findMany({
            where: {
                companyId,
                eventType: filters?.eventType,
            },
            include: {
                product: {
                    select: {
                        title: true,
                        handle: true,
                    },
                },
                companyUser: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: filters?.limit || 100,
        });
    }
    async getAnalytics(merchantId, dateRange) {
        const where = { merchantId };
        if (dateRange) {
            where.createdAt = {
                gte: dateRange.from,
                lte: dateRange.to,
            };
        }
        const [totalEvents, productViews, addToCarts, uniqueSessions, topProducts,] = await Promise.all([
            this.prisma.activityLog.count({ where }),
            this.prisma.activityLog.count({ where: { ...where, eventType: 'product_view' } }),
            this.prisma.activityLog.count({ where: { ...where, eventType: 'add_to_cart' } }),
            this.prisma.activityLog.findMany({
                where,
                select: { sessionId: true },
                distinct: ['sessionId'],
            }),
            this.prisma.activityLog.groupBy({
                by: ['shopifyProductId'],
                where: { ...where, eventType: 'product_view' },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),
        ]);
        return {
            totalEvents,
            productViews,
            addToCarts,
            uniqueSessions: uniqueSessions.length,
            conversionRate: productViews > 0 ? ((addToCarts / productViews) * 100).toFixed(2) : 0,
            topProducts,
        };
    }
    async getAdminActivityFeed(merchantId, limit = 50) {
        const logs = await this.prisma.activityLog.findMany({
            where: { merchantId },
            include: {
                companyUser: {
                    select: { email: true, firstName: true, lastName: true },
                },
                company: {
                    select: { name: true },
                },
                product: {
                    select: { title: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        const activities = logs.map(log => {
            const userName = log.companyUser
                ? `${log.companyUser.firstName || ''} ${log.companyUser.lastName || ''}`.trim() || log.companyUser.email
                : 'System';
            const companyName = log.company?.name || '';
            const productTitle = log.product?.title || '';
            let description = log.eventType;
            switch (log.eventType) {
                case 'product_view':
                    description = `Viewed product: ${productTitle}`;
                    break;
                case 'add_to_cart':
                    description = `Added to cart: ${productTitle}`;
                    break;
                case 'page_view':
                    description = 'Viewed a page';
                    break;
                case 'login':
                    description = `User logged in`;
                    break;
                case 'checkout_started':
                    description = 'Started checkout';
                    break;
                default:
                    description = log.eventType.replace(/_/g, ' ');
            }
            return {
                id: log.id,
                type: log.eventType.split('_')[0] || 'system',
                description,
                user: userName,
                company: companyName,
                createdAt: log.createdAt,
            };
        });
        return { activities, total: activities.length };
    }
    async getWebhookActivityFeed(merchantId, limit = 100) {
        const webhookEventTypes = ['order_created', 'order_paid', 'customer_created', 'checkout_started', 'checkout_completed'];
        const logs = await this.prisma.activityLog.findMany({
            where: {
                merchantId,
                eventType: { in: webhookEventTypes },
            },
            include: {
                companyUser: {
                    select: { email: true, firstName: true, lastName: true },
                },
                company: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        const webhookLogs = logs.map(log => ({
            id: log.id,
            topic: log.eventType.replace(/_/g, '/'),
            status: 'success',
            payload: log.payload ? JSON.stringify(log.payload).substring(0, 200) : null,
            company: log.company?.name,
            user: log.companyUser ? `${log.companyUser.firstName || ''} ${log.companyUser.lastName || ''}`.trim() : null,
            ipAddress: log.ipAddress,
            createdAt: log.createdAt,
        }));
        return { logs: webhookLogs, total: webhookLogs.length };
    }
    async getSessionActivityFeed(merchantId, limit = 50) {
        const loginEvents = await this.prisma.activityLog.findMany({
            where: {
                merchantId,
                eventType: 'login',
            },
            include: {
                companyUser: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        const sessionMap = new Map();
        for (const event of loginEvents) {
            const key = event.sessionId || event.id;
            if (!sessionMap.has(key)) {
                sessionMap.set(key, {
                    id: event.sessionId || event.id,
                    userId: event.companyUser?.id || event.companyUserId || 'unknown',
                    userName: event.companyUser
                        ? `${event.companyUser.firstName || ''} ${event.companyUser.lastName || ''}`.trim() || 'User'
                        : 'Unknown',
                    email: event.companyUser?.email || '',
                    ip: event.ipAddress || 'N/A',
                    userAgent: event.userAgent || 'Unknown Device',
                    lastActivity: event.createdAt,
                    createdAt: event.createdAt,
                });
            }
        }
        return { sessions: Array.from(sessionMap.values()), total: sessionMap.size };
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = EventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bull_1.InjectQueue)('events-raw-queue')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], EventsService);
//# sourceMappingURL=events.service.js.map