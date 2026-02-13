import { Injectable } from '@nestjs/common';
import {
    PaginationParams,
    buildPrismaOrderBy,
    buildPrismaSkipTake,
    createPaginatedResponse
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Optimized select for product list (minimal data for grid/list view)
 */
const PRODUCT_LIST_SELECT = {
  id: true,
  shopifyProductId: true,
  title: true,
  vendor: true,
  productType: true,
  status: true,
  images: true,
  tags: true,
  totalInventory: true,
  reviewsAvgRating: true,
  reviewsCount: true,
  publishedAt: true,
  hasOnlyDefaultVariant: true,
  onlineStoreUrl: true,
  createdAt: true,
  updatedAt: true,
  variants: {
    take: 1, // Only first variant for price display
    select: {
      id: true,
      shopifyVariantId: true,
      price: true,
      compareAtPrice: true,
      inventoryQuantity: true,
      availableForSale: true,
    },
  },
  _count: {
    select: {
      variants: true,
    },
  },
} as const;

/**
 * Full product detail select (all fields)
 */
const PRODUCT_DETAIL_SELECT = {
  id: true,
  shopifyProductId: true,
  title: true,
  handle: true,
  description: true,
  descriptionHtml: true,
  vendor: true,
  productType: true,
  status: true,
  images: true,
  collections: true,
  tags: true,
  metafields: true,
  seoTitle: true,
  seoDescription: true,
  options: true,
  media: true,
  templateSuffix: true,
  publishedAt: true,
  onlineStoreUrl: true,
  totalInventory: true,
  hasOnlyDefaultVariant: true,
  requiresSellingPlan: true,
  reviewsAvgRating: true,
  reviewsCount: true,
  rawData: true,
  createdAt: true,
  updatedAt: true,
  variants: {
    select: {
      id: true,
      shopifyVariantId: true,
      title: true,
      sku: true,
      barcode: true,
      price: true,
      compareAtPrice: true,
      inventoryQuantity: true,
      weight: true,
      weightUnit: true,
      option1: true,
      option2: true,
      option3: true,
      imageUrl: true,
      position: true,
      taxable: true,
      requiresShipping: true,
      availableForSale: true,
      inventoryPolicy: true,
      rawData: true,
    },
    orderBy: { position: 'asc' as const },
  },
} as const;

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getProducts(merchantId: string, filters?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
    vendor?: string;
    productType?: string;
    inStock?: boolean;
    collection?: string;
  }) {
    const pagination: PaginationParams = {
      page: filters?.page || 1,
      limit: Math.min(filters?.limit || 20, 100), // Max 100 per page
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    };

    const where: any = { merchantId };

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { vendor: { contains: filters.search, mode: 'insensitive' } },
        { tags: { contains: filters.search, mode: 'insensitive' } },
        { productType: { contains: filters.search, mode: 'insensitive' } },
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

    // Filter by stock availability
    if (filters?.inStock === true) {
      where.totalInventory = { gt: 0 };
    } else if (filters?.inStock === false) {
      where.totalInventory = { lte: 0 };
    }

    const [data, total] = await Promise.all([
      this.prisma.catalogProduct.findMany({
        where,
        select: PRODUCT_LIST_SELECT,
        orderBy: buildPrismaOrderBy(pagination, ['updatedAt', 'title', 'createdAt']),
        ...buildPrismaSkipTake(pagination),
      }),
      this.prisma.catalogProduct.count({ where }),
    ]);

    return createPaginatedResponse(data, total, pagination);
  }

  async getProduct(productId: string) {
    return this.prisma.catalogProduct.findUnique({
      where: { id: productId },
      select: PRODUCT_DETAIL_SELECT,
    });
  }

  async getVariant(variantId: string) {
    return this.prisma.catalogVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            images: true,
            status: true,
            handle: true,
            vendor: true,
            productType: true,
            onlineStoreUrl: true,
          },
        },
      },
    });
  }

  /**
   * Get product filters for sidebar (vendors, types, etc.)
   */
  async getProductFilters(merchantId: string) {
    const [vendors, productTypes, statusCounts] = await Promise.all([
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
      this.prisma.catalogProduct.groupBy({
        by: ['status'],
        where: { merchantId },
        _count: { status: true },
      }),
    ]);

    // Calculate inventory stats
    const [inStockCount, outOfStockCount, totalProducts] = await Promise.all([
      this.prisma.catalogProduct.count({ where: { merchantId, totalInventory: { gt: 0 } } }),
      this.prisma.catalogProduct.count({ where: { merchantId, totalInventory: { lte: 0 } } }),
      this.prisma.catalogProduct.count({ where: { merchantId } }),
    ]);

    return {
      vendors: vendors.filter(v => v.vendor).map(v => ({ name: v.vendor, count: v._count.vendor })),
      productTypes: productTypes.filter(p => p.productType).map(p => ({ name: p.productType, count: p._count.productType })),
      statusCounts: statusCounts.map(s => ({ status: s.status, count: s._count.status })),
      inventoryStats: {
        total: totalProducts,
        inStock: inStockCount,
        outOfStock: outOfStockCount,
      },
    };
  }

  /**
   * Get products by collection handle/title
   */
  async getProductsByCollection(merchantId: string, collectionHandle: string, page = 1, limit = 20) {
    const pagination: PaginationParams = {
      page,
      limit: Math.min(limit, 100),
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    };

    // Search in the JSON collections field
    const allProducts = await this.prisma.catalogProduct.findMany({
      where: { merchantId },
      select: { ...PRODUCT_LIST_SELECT, collections: true },
    });

    // Filter products that belong to the collection
    const filtered = allProducts.filter((p: any) => {
      if (!Array.isArray(p.collections)) return false;
      return p.collections.some(
        (c: any) => c.handle === collectionHandle || c.title === collectionHandle,
      );
    });

    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return createPaginatedResponse(paged, filtered.length, pagination);
  }

  /**
   * Search products with full-text search
   */
  async searchProducts(merchantId: string, query: string, limit = 20) {
    return this.prisma.catalogProduct.findMany({
      where: {
        merchantId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { vendor: { contains: query, mode: 'insensitive' } },
          { tags: { contains: query, mode: 'insensitive' } },
          { productType: { contains: query, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: query, mode: 'insensitive' } } } },
          { variants: { some: { barcode: { contains: query, mode: 'insensitive' } } } },
        ],
      },
      select: PRODUCT_LIST_SELECT,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
  }
}
