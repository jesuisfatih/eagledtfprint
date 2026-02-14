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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OrdersService = class OrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    mapOrder(order) {
        return {
            id: order.id,
            orderNumber: order.shopifyOrderNumber || order.shopifyOrderId?.toString() || order.id,
            shopifyOrderId: order.shopifyOrderId ? Number(order.shopifyOrderId) : null,
            status: this.mapFinancialToStatus(order.financialStatus),
            paymentStatus: this.mapPaymentStatus(order.financialStatus),
            fulfillmentStatus: order.fulfillmentStatus || 'unfulfilled',
            totalPrice: order.totalPrice,
            subtotalPrice: order.subtotal,
            taxTotal: order.totalTax,
            discountTotal: order.totalDiscounts,
            currency: order.currency || 'USD',
            email: order.email,
            lineItems: order.lineItems,
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            discountCodes: order.discountCodes,
            company: order.company,
            companyUser: order.companyUser,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        };
    }
    mapFinancialToStatus(financialStatus) {
        const statusMap = {
            pending: 'pending',
            authorized: 'confirmed',
            partially_paid: 'processing',
            paid: 'confirmed',
            partially_refunded: 'confirmed',
            refunded: 'cancelled',
            voided: 'cancelled',
        };
        return statusMap[financialStatus] || 'pending';
    }
    mapPaymentStatus(financialStatus) {
        const statusMap = {
            pending: 'pending',
            authorized: 'pending',
            partially_paid: 'pending',
            paid: 'paid',
            partially_refunded: 'refunded',
            refunded: 'refunded',
            voided: 'failed',
        };
        return statusMap[financialStatus] || 'pending';
    }
    async findAll(merchantId, filters) {
        const where = { merchantId };
        if (filters?.companyId) {
            where.companyId = filters.companyId;
        }
        if (filters?.status) {
            where.financialStatus = filters.status;
        }
        const orders = await this.prisma.orderLocal.findMany({
            where,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                companyUser: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return orders.map(order => this.mapOrder(order));
    }
    async findOne(id, merchantId, companyId) {
        const where = { id, merchantId };
        if (companyId) {
            where.companyId = companyId;
        }
        const order = await this.prisma.orderLocal.findFirst({
            where,
            include: {
                company: true,
                companyUser: true,
            },
        });
        return order ? this.mapOrder(order) : null;
    }
    async getStats(merchantId, companyId) {
        const where = { merchantId };
        if (companyId) {
            where.companyId = companyId;
        }
        const [total, totalRevenue] = await Promise.all([
            this.prisma.orderLocal.count({ where }),
            this.prisma.orderLocal.aggregate({
                where,
                _sum: { totalPrice: true },
            }),
        ]);
        return {
            total,
            totalRevenue: totalRevenue._sum.totalPrice || 0,
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map