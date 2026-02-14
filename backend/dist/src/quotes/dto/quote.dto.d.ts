export declare class QuoteItemDto {
    productId: string;
    variantId?: string;
    title: string;
    sku?: string;
    quantity: number;
    requestedPrice?: number;
}
export declare class CreateQuoteDto {
    items: QuoteItemDto[];
    notes?: string;
    poNumber?: string;
}
export declare class UpdateQuoteStatusDto {
    responseNotes?: string;
}
