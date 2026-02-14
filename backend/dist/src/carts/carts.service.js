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
exports.CartsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricing_calculator_service_1 = require("../pricing/pricing-calculator.service");
let CartsService = class CartsService {
    prisma;
    pricingCalculator;
    constructor(prisma, pricingCalculator) {
        this.prisma = prisma;
        this.pricingCalculator = pricingCalculator;
    }
    async create(companyId, createdByUserId, merchantId) {
        return this.prisma.cart.create({
            data: {
                merchantId,
                companyId,
                createdByUserId,
                status: 'draft',
            },
            include: {
                items: true,
                company: true,
                createdBy: true,
            },
        });
    }
    async findActiveCart(companyId, userId) {
        return this.prisma.cart.findFirst({
            where: {
                companyId,
                createdByUserId: userId,
                status: 'draft',
            },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }
    async findById(id) {
        const cart = await this.prisma.cart.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
                company: true,
                createdBy: true,
                approvedBy: true,
            },
        });
        if (!cart) {
            throw new common_1.NotFoundException('Cart not found');
        }
        return cart;
    }
    async recalculate(cartId) {
        const result = await this.pricingCalculator.calculateCartPricing(cartId);
        return this.findById(cartId);
    }
    async submitForApproval(cartId) {
        const cart = await this.findById(cartId);
        if (cart.status !== 'draft') {
            throw new Error('Only draft carts can be submitted for approval');
        }
        return this.prisma.cart.update({
            where: { id: cartId },
            data: { status: 'pending_approval' },
        });
    }
    async approve(cartId, approvedByUserId) {
        const cart = await this.findById(cartId);
        if (cart.status !== 'pending_approval') {
            throw new Error('Only pending carts can be approved');
        }
        return this.prisma.cart.update({
            where: { id: cartId },
            data: {
                status: 'approved',
                approvedByUserId,
                approvedAt: new Date(),
            },
        });
    }
    async reject(cartId) {
        return this.prisma.cart.update({
            where: { id: cartId },
            data: { status: 'rejected' },
        });
    }
    async abandon(cartId) {
        return this.prisma.cart.update({
            where: { id: cartId },
            data: { status: 'abandoned' },
        });
    }
    async delete(cartId) {
        return this.prisma.cart.delete({
            where: { id: cartId },
        });
    }
    async listCompanyCarts(companyId, status) {
        const where = { companyId };
        if (status) {
            where.status = status;
        }
        return this.prisma.cart.findMany({
            where,
            include: {
                items: true,
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }
};
exports.CartsService = CartsService;
exports.CartsService = CartsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pricing_calculator_service_1.PricingCalculatorService])
], CartsService);
//# sourceMappingURL=carts.service.js.map