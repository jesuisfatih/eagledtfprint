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
exports.QuotesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let QuotesService = class QuotesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, userId, data) {
        return this.prisma.cart.create({
            data: {
                merchantId: data.merchantId,
                companyId,
                createdByUserId: userId,
                status: 'quote_requested',
                notes: data.notes,
                metadata: { type: 'quote', ...data.metadata },
            },
        });
    }
    async findAll(companyId) {
        return this.prisma.cart.findMany({
            where: {
                companyId,
                status: { in: ['quote_requested', 'quote_approved', 'quote_rejected'] },
            },
            include: {
                items: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
                createdBy: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async approve(quoteId, approvedByUserId) {
        return this.prisma.cart.update({
            where: { id: quoteId },
            data: {
                status: 'quote_approved',
                approvedByUserId,
                approvedAt: new Date(),
            },
        });
    }
    async reject(quoteId) {
        return this.prisma.cart.update({
            where: { id: quoteId },
            data: { status: 'quote_rejected' },
        });
    }
};
exports.QuotesService = QuotesService;
exports.QuotesService = QuotesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuotesService);
//# sourceMappingURL=quotes.service.js.map