import { PrismaService } from '../prisma/prisma.service';
export declare class CatalogService {
    private prisma;
    constructor(prisma: PrismaService);
    getProducts(merchantId: string, filters?: {
        search?: string;
        page?: number;
        limit?: number;
        status?: string;
        vendor?: string;
        productType?: string;
    }): Promise<import("../common/utils/pagination.util").PaginatedResponse<{
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
        _count: {
            variants: number;
        };
        variants: {
            id: string;
            shopifyVariantId: bigint;
            price: import("@prisma/client-runtime-utils").Decimal | null;
            compareAtPrice: import("@prisma/client-runtime-utils").Decimal | null;
            inventoryQuantity: number | null;
        }[];
    }>>;
    getProduct(productId: string): Promise<{
        id: string;
        status: string | null;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
        rawData: import("@prisma/client/runtime/client").JsonValue;
        shopifyProductId: bigint;
        title: string | null;
        description: string | null;
        vendor: string | null;
        productType: string | null;
        images: import("@prisma/client/runtime/client").JsonValue;
        variants: {
            id: string;
            rawData: import("@prisma/client/runtime/client").JsonValue;
            title: string | null;
            shopifyVariantId: bigint;
            sku: string | null;
            price: import("@prisma/client-runtime-utils").Decimal | null;
            compareAtPrice: import("@prisma/client-runtime-utils").Decimal | null;
            inventoryQuantity: number | null;
            option1: string | null;
            option2: string | null;
            option3: string | null;
        }[];
    } | null>;
    getVariant(variantId: string): Promise<({
        product: {
            id: string;
            status: string | null;
            title: string | null;
            images: import("@prisma/client/runtime/client").JsonValue;
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
        price: import("@prisma/client-runtime-utils").Decimal | null;
        compareAtPrice: import("@prisma/client-runtime-utils").Decimal | null;
        inventoryQuantity: number | null;
        weight: import("@prisma/client-runtime-utils").Decimal | null;
        weightUnit: string | null;
        option1: string | null;
        option2: string | null;
        option3: string | null;
    }) | null>;
    getProductFilters(merchantId: string): Promise<{
        vendors: {
            name: string | null;
            count: number;
        }[];
        productTypes: {
            name: string | null;
            count: number;
        }[];
    }>;
}
