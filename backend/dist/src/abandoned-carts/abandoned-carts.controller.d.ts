import { AbandonedCartsService } from './abandoned-carts.service';
import { TrackCartDto, SyncCartDto, GetAbandonedCartsQueryDto } from './dto/abandoned-cart.dto';
export declare class AbandonedCartsController {
    private abandonedCartsService;
    constructor(abandonedCartsService: AbandonedCartsService);
    getAbandonedCarts(merchantId: string, query: GetAbandonedCartsQueryDto): Promise<({
        company: {
            name: string;
            id: string;
        };
        createdBy: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        items: ({
            variant: ({
                product: {
                    id: string;
                    status: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    merchantId: string;
                    tags: string | null;
                    rawData: import("@prisma/client/runtime/client").JsonValue | null;
                    syncedAt: Date;
                    shopifyProductId: bigint;
                    title: string | null;
                    handle: string | null;
                    description: string | null;
                    vendor: string | null;
                    productType: string | null;
                    images: import("@prisma/client/runtime/client").JsonValue | null;
                    collections: import("@prisma/client/runtime/client").JsonValue | null;
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
            }) | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            shopifyProductId: bigint | null;
            title: string | null;
            cartId: string;
            productId: string | null;
            variantId: string | null;
            shopifyVariantId: bigint | null;
            quantity: number;
            sku: string | null;
            variantTitle: string | null;
            listPrice: import("@prisma/client-runtime-utils").Decimal;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            discountAmount: import("@prisma/client-runtime-utils").Decimal;
            lineTotal: import("@prisma/client-runtime-utils").Decimal | null;
            appliedPricingRuleId: string | null;
        })[];
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        companyId: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        currency: string;
        createdByUserId: string;
        discountTotal: import("@prisma/client-runtime-utils").Decimal;
        taxTotal: import("@prisma/client-runtime-utils").Decimal;
        total: import("@prisma/client-runtime-utils").Decimal;
        appliedPricingRules: import("@prisma/client/runtime/client").JsonValue | null;
        shopifyCartId: string | null;
        shopifyCheckoutUrl: string | null;
        approvedByUserId: string | null;
        approvedAt: Date | null;
        convertedToOrderId: string | null;
        convertedAt: Date | null;
        notes: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
    getMyAbandonedCarts(merchantId: string, companyId: string): Promise<({
        company: {
            name: string;
            id: string;
        };
        createdBy: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        items: ({
            variant: ({
                product: {
                    id: string;
                    status: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    merchantId: string;
                    tags: string | null;
                    rawData: import("@prisma/client/runtime/client").JsonValue | null;
                    syncedAt: Date;
                    shopifyProductId: bigint;
                    title: string | null;
                    handle: string | null;
                    description: string | null;
                    vendor: string | null;
                    productType: string | null;
                    images: import("@prisma/client/runtime/client").JsonValue | null;
                    collections: import("@prisma/client/runtime/client").JsonValue | null;
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
            }) | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            shopifyProductId: bigint | null;
            title: string | null;
            cartId: string;
            productId: string | null;
            variantId: string | null;
            shopifyVariantId: bigint | null;
            quantity: number;
            sku: string | null;
            variantTitle: string | null;
            listPrice: import("@prisma/client-runtime-utils").Decimal;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            discountAmount: import("@prisma/client-runtime-utils").Decimal;
            lineTotal: import("@prisma/client-runtime-utils").Decimal | null;
            appliedPricingRuleId: string | null;
        })[];
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        companyId: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        currency: string;
        createdByUserId: string;
        discountTotal: import("@prisma/client-runtime-utils").Decimal;
        taxTotal: import("@prisma/client-runtime-utils").Decimal;
        total: import("@prisma/client-runtime-utils").Decimal;
        appliedPricingRules: import("@prisma/client/runtime/client").JsonValue | null;
        shopifyCartId: string | null;
        shopifyCheckoutUrl: string | null;
        approvedByUserId: string | null;
        approvedAt: Date | null;
        convertedToOrderId: string | null;
        convertedAt: Date | null;
        notes: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
    syncCart(dto: SyncCartDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        companyId: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        currency: string;
        createdByUserId: string;
        discountTotal: import("@prisma/client-runtime-utils").Decimal;
        taxTotal: import("@prisma/client-runtime-utils").Decimal;
        total: import("@prisma/client-runtime-utils").Decimal;
        appliedPricingRules: import("@prisma/client/runtime/client").JsonValue | null;
        shopifyCartId: string | null;
        shopifyCheckoutUrl: string | null;
        approvedByUserId: string | null;
        approvedAt: Date | null;
        convertedToOrderId: string | null;
        convertedAt: Date | null;
        notes: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    trackCart(dto: TrackCartDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        companyId: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        currency: string;
        createdByUserId: string;
        discountTotal: import("@prisma/client-runtime-utils").Decimal;
        taxTotal: import("@prisma/client-runtime-utils").Decimal;
        total: import("@prisma/client-runtime-utils").Decimal;
        appliedPricingRules: import("@prisma/client/runtime/client").JsonValue | null;
        shopifyCartId: string | null;
        shopifyCheckoutUrl: string | null;
        approvedByUserId: string | null;
        approvedAt: Date | null;
        convertedToOrderId: string | null;
        convertedAt: Date | null;
        notes: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    } | {
        statusCode: number;
        message: any;
        error: string;
    }>;
    getCartActivity(cartId: string): Promise<{
        id: string;
        createdAt: Date;
        merchantId: string;
        shopifyCustomerId: bigint | null;
        shopifyProductId: bigint | null;
        companyId: string | null;
        companyUserId: string | null;
        sessionId: string | null;
        eagleToken: string | null;
        eventType: string;
        productId: string | null;
        variantId: string | null;
        shopifyVariantId: bigint | null;
        payload: import("@prisma/client/runtime/client").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        referrer: string | null;
    }[]>;
    getAllCartActivity(merchantId: string, limit?: string): Promise<({
        company: {
            name: string;
            id: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        merchantId: string;
        shopifyCustomerId: bigint | null;
        shopifyProductId: bigint | null;
        companyId: string | null;
        companyUserId: string | null;
        sessionId: string | null;
        eagleToken: string | null;
        eventType: string;
        productId: string | null;
        variantId: string | null;
        shopifyVariantId: bigint | null;
        payload: import("@prisma/client/runtime/client").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        referrer: string | null;
    })[]>;
    restoreCart(id: string, merchantId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteCart(id: string, merchantId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
