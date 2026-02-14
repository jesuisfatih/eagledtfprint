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
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const pagination_util_1 = require("../common/utils/pagination.util");
const prisma_service_1 = require("../prisma/prisma.service");
const shopify_company_sync_service_1 = require("./shopify-company-sync.service");
const COMPANY_LIST_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    users: {
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
        },
    },
    _count: {
        select: {
            users: true,
            orders: true,
        },
    },
};
const COMPANY_DETAIL_INCLUDE = {
    merchant: true,
    users: {
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
    },
    pricingRules: {
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            discountType: true,
            discountValue: true,
            priority: true,
        },
    },
    orders: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            shopifyOrderId: true,
            shopifyOrderNumber: true,
            totalPrice: true,
            financialStatus: true,
            createdAt: true,
        },
    },
};
let CompaniesService = class CompaniesService {
    prisma;
    shopifyCompanySync;
    constructor(prisma, shopifyCompanySync) {
        this.prisma = prisma;
        this.shopifyCompanySync = shopifyCompanySync;
    }
    async findAll(merchantId, filters) {
        const pagination = {
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            sortBy: 'createdAt',
            sortOrder: 'desc',
        };
        const where = { merchantId };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.company.findMany({
                where,
                select: COMPANY_LIST_SELECT,
                orderBy: (0, pagination_util_1.buildPrismaOrderBy)(pagination, ['createdAt', 'name', 'email']),
                ...(0, pagination_util_1.buildPrismaSkipTake)(pagination),
            }),
            this.prisma.company.count({ where }),
        ]);
        return (0, pagination_util_1.createPaginatedResponse)(data, total, pagination);
    }
    async findOne(id, merchantId) {
        const company = await this.prisma.company.findFirst({
            where: { id, merchantId },
            include: COMPANY_DETAIL_INCLUDE,
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return company;
    }
    async create(merchantId, data) {
        const company = await this.prisma.company.create({
            data: {
                merchantId,
                name: data.name,
                legalName: data.legalName,
                taxId: data.taxId,
                email: data.email,
                phone: data.phone,
                website: data.website,
                billingAddress: data.billingAddress,
                shippingAddress: data.shippingAddress,
                companyGroup: data.companyGroup,
                status: 'pending',
            },
        });
        try {
            await this.shopifyCompanySync.syncCompanyToShopify(company.id);
        }
        catch (error) {
            console.error('Company Shopify sync failed:', error);
        }
        return company;
    }
    async approve(id, merchantId) {
        const company = await this.findOne(id, merchantId);
        const updatedCompany = await this.prisma.company.update({
            where: { id },
            data: {
                status: 'active',
            },
        });
        await this.prisma.companyUser.updateMany({
            where: { companyId: id },
            data: {
                isActive: true,
            },
        });
        try {
            await this.shopifyCompanySync.syncCompanyToShopify(id);
        }
        catch (error) {
            console.error('Company Shopify sync failed after approval:', error);
        }
        return updatedCompany;
    }
    async reject(id, merchantId, reason) {
        const company = await this.findOne(id, merchantId);
        const updatedCompany = await this.prisma.company.update({
            where: { id },
            data: {
                status: 'rejected',
                settings: {
                    ...company.settings,
                    rejectionReason: reason,
                },
            },
        });
        return updatedCompany;
    }
    async update(id, merchantId, data) {
        await this.findOne(id, merchantId);
        const company = await this.prisma.company.update({
            where: { id },
            data: {
                name: data.name,
                legalName: data.legalName,
                taxId: data.taxId,
                email: data.email,
                phone: data.phone,
                website: data.website,
                billingAddress: data.billingAddress,
                shippingAddress: data.shippingAddress,
                companyGroup: data.companyGroup,
                status: data.status,
            },
        });
        try {
            await this.shopifyCompanySync.updateCompanyInShopify(id);
        }
        catch (error) {
            console.error('Company Shopify update failed:', error);
        }
        return company;
    }
    async delete(id, merchantId) {
        await this.findOne(id, merchantId);
        return this.prisma.company.delete({ where: { id } });
    }
    async getStats(merchantId) {
        const [total, active, pending, suspended] = await Promise.all([
            this.prisma.company.count({ where: { merchantId } }),
            this.prisma.company.count({ where: { merchantId, status: 'active' } }),
            this.prisma.company.count({ where: { merchantId, status: 'pending' } }),
            this.prisma.company.count({ where: { merchantId, status: 'suspended' } }),
        ]);
        const totalUsers = await this.prisma.companyUser.count({
            where: { company: { merchantId } },
        });
        return {
            total,
            active,
            pending,
            suspended,
            totalUsers,
        };
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_company_sync_service_1.ShopifyCompanySyncService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map