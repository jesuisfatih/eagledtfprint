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
exports.CatalogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utils/pagination.util");
const PRODUCT_LIST_SELECT = {
    id: true,
    shopifyProductId: true,
    title: true,
    vendor: true,
    productType: true,
    status: true,
    images: true,
    tags: true,
    createdAt: true,
    updatedAt: true,
    variants: {
        take: 1,
        select: {
            id: true,
            shopifyVariantId: true,
            price: true,
            compareAtPrice: true,
            inventoryQuantity: true,
        },
    },
    _count: {
        select: {
            variants: true,
        },
    },
};
const PRODUCT_DETAIL_SELECT = {
    id: true,
    shopifyProductId: true,
    title: true,
    description: true,
    vendor: true,
    productType: true,
    status: true,
    images: true,
    tags: true,
    rawData: true,
    createdAt: true,
    updatedAt: true,
    variants: {
        select: {
            id: true,
            shopifyVariantId: true,
            title: true,
            sku: true,
            price: true,
            compareAtPrice: true,
            inventoryQuantity: true,
            option1: true,
            option2: true,
            option3: true,
            rawData: true,
        },
    },
};
let CatalogService = class CatalogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProducts(merchantId, filters) {
        const pagination = {
            page: filters?.page || 1,
            limit: Math.min(filters?.limit || 20, 100),
            sortBy: 'updatedAt',
            sortOrder: 'desc',
        };
        const where = { merchantId };
        if (filters?.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { vendor: { contains: filters.search, mode: 'insensitive' } },
                { tags: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.vendor) {
            where.vendor = filters.vendor;
        }
        if (filters?.productType) {
            where.productType = filters.productType;
        }
        const [data, total] = await Promise.all([
            this.prisma.catalogProduct.findMany({
                where,
                select: PRODUCT_LIST_SELECT,
                orderBy: (0, pagination_util_1.buildPrismaOrderBy)(pagination, ['updatedAt', 'title', 'createdAt']),
                ...(0, pagination_util_1.buildPrismaSkipTake)(pagination),
            }),
            this.prisma.catalogProduct.count({ where }),
        ]);
        return (0, pagination_util_1.createPaginatedResponse)(data, total, pagination);
    }
    async getProduct(productId) {
        return this.prisma.catalogProduct.findUnique({
            where: { id: productId },
            select: PRODUCT_DETAIL_SELECT,
        });
    }
    async getVariant(variantId) {
        return this.prisma.catalogVariant.findUnique({
            where: { id: variantId },
            include: {
                product: {
                    select: {
                        id: true,
                        title: true,
                        images: true,
                        status: true,
                    },
                },
            },
        });
    }
    async getProductFilters(merchantId) {
        const [vendors, productTypes] = await Promise.all([
            this.prisma.catalogProduct.groupBy({
                by: ['vendor'],
                where: { merchantId, vendor: { not: null } },
                _count: { vendor: true },
                orderBy: { _count: { vendor: 'desc' } },
                take: 50,
            }),
            this.prisma.catalogProduct.groupBy({
                by: ['productType'],
                where: { merchantId, productType: { not: null } },
                _count: { productType: true },
                orderBy: { _count: { productType: 'desc' } },
                take: 50,
            }),
        ]);
        return {
            vendors: vendors.filter(v => v.vendor).map(v => ({ name: v.vendor, count: v._count.vendor })),
            productTypes: productTypes.filter(p => p.productType).map(p => ({ name: p.productType, count: p._count.productType })),
        };
    }
};
exports.CatalogService = CatalogService;
exports.CatalogService = CatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CatalogService);
//# sourceMappingURL=catalog.service.js.map