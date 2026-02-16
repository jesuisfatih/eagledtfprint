import { CatalogService } from './catalog.service';
export declare class CatalogController {
    private catalogService;
    constructor(catalogService: CatalogService);
    getProducts(merchantId: string, search?: string, page?: string, limit?: string, status?: string, vendor?: string, productType?: string, inStock?: string, collection?: string): Promise<import("../common/utils/pagination.util").PaginatedResponse<{
        id: string;
        status: string | null;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
        shopifyProductId: bigint;
        title: string | null;
        vendor: string | null;
        productType: string | null;
        images: import("@prisma/client/runtime/client").JsonValue;
        publishedAt: Date | null;
        onlineStoreUrl: string | null;
        totalInventory: number | null;
        hasOnlyDefaultVariant: boolean | null;
        reviewsAvgRating: import("@prisma/client-runtime-utils").Decimal | null;
        reviewsCount: number | null;
        _count: {
            variants: number;
        };
        variants: {
            id: string;
            shopifyVariantId: bigint;
            price: import("@prisma/client-runtime-utils").Decimal | null;
            compareAtPrice: import("@prisma/client-runtime-utils").Decimal | null;
            inventoryQuantity: number | null;
            availableForSale: boolean | null;
        }[];
    }>>;
    getProductFilters(merchantId: string): Promise<{
        vendors: {
            name: string | null;
            count: number;
        }[];
        productTypes: {
            name: string | null;
            count: number;
        }[];
        statusCounts: {
            status: string | null;
            count: number;
        }[];
        inventoryStats: {
            total: number;
            inStock: number;
            outOfStock: number;
        };
    }>;
    searchProducts(merchantId: string, query: string, limit?: string): Promise<{
        id: string;
        status: string | null;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
        shopifyProductId: bigint;
        title: string | null;
        vendor: string | null;
        productType: string | null;
        images: import("@prisma/client/runtime/client").JsonValue;
        publishedAt: Date | null;
        onlineStoreUrl: string | null;
        totalInventory: number | null;
        hasOnlyDefaultVariant: boolean | null;
        reviewsAvgRating: import("@prisma/client-runtime-utils").Decimal | null;
        reviewsCount: number | null;
        _count: {
            variants: number;
        };
        variants: {
            id: string;
            shopifyVariantId: bigint;
            price: import("@prisma/client-runtime-utils").Decimal | null;
            compareAtPrice: import("@prisma/client-runtime-utils").Decimal | null;
            inventoryQuantity: number | null;
            availableForSale: boolean | null;
        }[];
    }[]>;
    getProduct(id: string): Promise<{
        id: string;
        status: string | null;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
        rawData: import("@prisma/client/runtime/client").JsonValue;
        metafields: import("@prisma/client/runtime/client").JsonValue;
        shopifyProductId: bigint;
        title: string | null;
        handle: string | null;
        description: string | null;
        descriptionHtml: string | null;
        vendor: string | null;
        productType: string | null;
        images: import("@prisma/client/runtime/client").JsonValue;
        collections: import("@prisma/client/runtime/client").JsonValue;
        seoTitle: string | null;
        seoDescription: string | null;
        options: import("@prisma/client/runtime/client").JsonValue;
        media: import("@prisma/client/runtime/client").JsonValue;
        templateSuffix: string | null;
        publishedAt: Date | null;
        onlineStoreUrl: string | null;
        totalInventory: number | null;
        hasOnlyDefaultVariant: boolean | null;
        requiresSellingPlan: boolean | null;
        reviewsAvgRating: import("@prisma/client-runtime-utils").Decimal | null;
        reviewsCount: number | null;
        variants: {
            id: string;
            rawData: import("@prisma/client/runtime/client").JsonValue;
            title: string | null;
            shopifyVariantId: bigint;
            sku: string | null;
            barcode: string | null;
            price: import("@prisma/client-runtime-utils").Decimal | null;
            compareAtPrice: import("@prisma/client-runtime-utils").Decimal | null;
            inventoryQuantity: number | null;
            weight: import("@prisma/client-runtime-utils").Decimal | null;
            weightUnit: string | null;
            option1: string | null;
            option2: string | null;
            option3: string | null;
            imageUrl: string | null;
            position: number | null;
            taxable: boolean | null;
            requiresShipping: boolean | null;
            availableForSale: boolean | null;
            inventoryPolicy: string | null;
        }[];
    } | null>;
    getVariant(id: string): Promise<({
        product: {
            id: string;
            status: string | null;
            title: string | null;
            handle: string | null;
            vendor: string | null;
            productType: string | null;
            images: import("@prisma/client/runtime/client").JsonValue;
            onlineStoreUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rawData: import("@prisma/client/runtime/client").JsonValue | null;
        syncedAt: Date;
        title: string | null;
        productId: string;
        shopifyVariantId: bigint;
        sku: string | null;
        barcode: string | null;
        price: import("@prisma/client-runtime-utils").Decimal | null;
        compareAtPrice: import("@prisma/client-runtime-utils").Decimal | null;
        inventoryQuantity: number | null;
        weight: import("@prisma/client-runtime-utils").Decimal | null;
        weightUnit: string | null;
        option1: string | null;
        option2: string | null;
        option3: string | null;
        imageUrl: string | null;
        position: number | null;
        taxable: boolean | null;
        requiresShipping: boolean | null;
        availableForSale: boolean | null;
        inventoryPolicy: string | null;
    }) | null>;
}
