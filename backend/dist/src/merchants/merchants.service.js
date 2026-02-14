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
exports.MerchantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MerchantsService = class MerchantsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        return this.prisma.merchant.findUnique({
            where: { id },
        });
    }
    async updateSettings(id, settings) {
        return this.prisma.merchant.update({
            where: { id },
            data: {
                settings,
                updatedAt: new Date(),
            },
        });
    }
    async toggleSnippet(id, enabled) {
        return this.prisma.merchant.update({
            where: { id },
            data: { snippetEnabled: enabled },
        });
    }
    async getStats(id) {
        const [totalCompanies, totalUsers, totalOrders, totalRevenue, totalProducts,] = await Promise.all([
            this.prisma.company.count({ where: { merchantId: id } }),
            this.prisma.companyUser.count({
                where: { company: { merchantId: id } },
            }),
            this.prisma.orderLocal.count({ where: { merchantId: id } }),
            this.prisma.orderLocal.aggregate({
                where: { merchantId: id },
                _sum: { totalPrice: true },
            }),
            this.prisma.catalogProduct.count({ where: { merchantId: id } }),
        ]);
        const revenue = totalRevenue._sum.totalPrice || 0;
        const avgOrderValue = totalOrders > 0 ? Number(revenue) / totalOrders : 0;
        return {
            totalCompanies,
            totalUsers,
            totalOrders,
            totalRevenue: revenue,
            totalProducts,
            avgOrderValue,
        };
    }
};
exports.MerchantsService = MerchantsService;
exports.MerchantsService = MerchantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MerchantsService);
//# sourceMappingURL=merchants.service.js.map