export declare class CartItemDto {
    shopifyVariantId: number;
    title: string;
    variantTitle?: string;
    quantity: number;
    price: number;
    imageUrl?: string;
}
export declare class TrackCartDto {
    cartToken?: string;
    shopDomain?: string;
    customerEmail?: string;
    customerPhone?: string;
    items?: CartItemDto[];
    subtotal?: number;
    total?: number;
    currency?: string;
    checkoutUrl?: string;
}
export declare class SyncCartDto {
    cartToken?: string;
    shopDomain?: string;
    email?: string;
    items?: any[];
    total?: number;
}
export declare class GetAbandonedCartsQueryDto {
    companyId?: string;
    includeRecent?: boolean;
}
