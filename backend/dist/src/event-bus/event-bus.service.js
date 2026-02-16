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
var EventBusService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusService = void 0;
const common_1 = require("@nestjs/common");
const dittofeed_service_1 = require("../dittofeed/dittofeed.service");
const prisma_service_1 = require("../prisma/prisma.service");
let EventBusService = EventBusService_1 = class EventBusService {
    prisma;
    dittofeed;
    logger = new common_1.Logger(EventBusService_1.name);
    constructor(prisma, dittofeed) {
        this.prisma = prisma;
        this.dittofeed = dittofeed;
    }
    async companyApproved(data) {
        this.logger.log(`Event: company_approved → ${data.companyName}`);
        await this.prisma.activityLog.create({
            data: {
                merchantId: data.merchantId,
                companyId: data.companyId,
                eventType: 'company_approved',
                payload: { companyName: data.companyName },
            },
        });
        for (const user of data.users) {
            await this.dittofeed.identifyCompanyUser({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                companyId: data.companyId,
                companyName: data.companyName,
                companyStatus: 'active',
                merchantId: data.merchantId,
            });
            await this.dittofeed.trackEvent(user.id, 'Company Approved', {
                companyId: data.companyId,
                companyName: data.companyName,
            });
        }
    }
    async orderCreated(data) {
        this.logger.log(`Event: order_created → #${data.orderNumber}`);
        await this.prisma.activityLog.create({
            data: {
                merchantId: data.merchantId,
                companyId: data.companyId,
                companyUserId: data.companyUserId,
                eventType: 'order_created',
                payload: {
                    orderId: data.orderId,
                    orderNumber: data.orderNumber,
                    totalPrice: data.totalPrice,
                    hasDesignFiles: data.hasDesignFiles,
                    designFileCount: data.designFileCount,
                    isPickup: data.isPickup,
                },
            },
        });
        if (data.companyUserId) {
            await this.dittofeed.trackEvent(data.companyUserId, 'Order Placed', {
                orderId: data.orderId,
                orderNumber: data.orderNumber,
                totalPrice: data.totalPrice,
                lineItemCount: data.lineItemCount,
                hasDesignFiles: data.hasDesignFiles,
                designFileCount: data.designFileCount,
                isPickup: data.isPickup,
            });
        }
    }
    async cartAbandoned(data) {
        this.logger.log(`Event: cart_abandoned → Cart ${data.cartId}`);
        await this.prisma.activityLog.create({
            data: {
                merchantId: data.merchantId,
                companyId: data.companyId,
                companyUserId: data.companyUserId,
                eventType: 'cart_abandoned',
                payload: {
                    cartId: data.cartId,
                    total: data.total,
                    itemCount: data.itemCount,
                    abandonedMinutes: data.abandonedMinutes,
                },
            },
        });
        if (data.companyUserId) {
            await this.dittofeed.trackEvent(data.companyUserId, 'Cart Abandoned', {
                cartId: data.cartId,
                total: data.total,
                itemCount: data.itemCount,
                abandonedMinutes: data.abandonedMinutes,
            });
        }
    }
    async designUploaded(data) {
        this.logger.log(`Event: design_uploaded → Order #${data.orderNumber} (${data.fileCount} files)`);
        await this.prisma.activityLog.create({
            data: {
                merchantId: data.merchantId,
                companyId: data.companyId,
                companyUserId: data.companyUserId,
                eventType: 'design_uploaded',
                payload: {
                    orderId: data.orderId,
                    orderNumber: data.orderNumber,
                    fileCount: data.fileCount,
                    dimensions: data.dimensions,
                },
            },
        });
        if (data.companyUserId) {
            await this.dittofeed.trackDesignEvent(data.companyUserId, 'Design Uploaded', {
                orderId: data.orderId,
                orderNumber: data.orderNumber,
                fileCount: data.fileCount,
                dimensions: data.dimensions[0],
            });
        }
    }
    async designAbandoned(data) {
        this.logger.log(`Event: design_abandoned → Project ${data.designProjectId}`);
        await this.prisma.activityLog.create({
            data: {
                merchantId: data.merchantId,
                companyId: data.companyId,
                companyUserId: data.companyUserId,
                eventType: 'design_abandoned',
                payload: {
                    designProjectId: data.designProjectId,
                    orderId: data.orderId,
                    hoursInactive: data.hoursInactive,
                },
            },
        });
        if (data.companyUserId) {
            await this.dittofeed.trackDesignEvent(data.companyUserId, 'Design Abandoned', {
                designProjectId: data.designProjectId,
                orderId: data.orderId,
            });
        }
    }
    async printReady(data) {
        this.logger.log(`Event: print_ready → Order #${data.orderNumber}`);
        await this.prisma.activityLog.create({
            data: {
                merchantId: data.merchantId,
                companyId: data.companyId,
                companyUserId: data.companyUserId,
                eventType: 'print_ready',
                payload: {
                    pickupOrderId: data.pickupOrderId,
                    orderId: data.orderId,
                    orderNumber: data.orderNumber,
                    shelfCode: data.shelfCode,
                    qrCode: data.qrCode,
                },
            },
        });
        if (data.companyUserId) {
            await this.dittofeed.trackEvent(data.companyUserId, 'Print Ready', {
                orderId: data.orderId,
                orderNumber: data.orderNumber,
                shelfCode: data.shelfCode,
                qrCode: data.qrCode,
            });
        }
    }
    async churnRiskDetected(data) {
        this.logger.log(`Event: churn_risk → ${data.companyName} (risk: ${data.churnRisk})`);
        await this.prisma.activityLog.create({
            data: {
                merchantId: data.merchantId,
                companyId: data.companyId,
                eventType: 'churn_risk_detected',
                payload: {
                    companyName: data.companyName,
                    healthScore: data.healthScore,
                    churnRisk: data.churnRisk,
                    daysSinceLastOrder: data.daysSinceLastOrder,
                },
            },
        });
        if (data.companyUserId) {
            await this.dittofeed.trackEvent(data.companyUserId, 'Churn Risk Detected', {
                companyId: data.companyId,
                companyName: data.companyName,
                healthScore: data.healthScore,
                churnRisk: data.churnRisk,
                daysSinceLastOrder: data.daysSinceLastOrder,
            });
        }
    }
    async emit(data) {
        await this.prisma.activityLog.create({
            data: {
                merchantId: data.merchantId,
                companyId: data.companyId,
                companyUserId: data.companyUserId,
                eventType: data.eventType,
                payload: (data.payload || {}),
            },
        });
        if (data.companyUserId && data.dittofeedEventName) {
            await this.dittofeed.trackEvent(data.companyUserId, data.dittofeedEventName, data.payload || {});
        }
    }
};
exports.EventBusService = EventBusService;
exports.EventBusService = EventBusService = EventBusService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dittofeed_service_1.DittofeedService])
], EventBusService);
//# sourceMappingURL=event-bus.service.js.map