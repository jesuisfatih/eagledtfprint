export declare enum TicketPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export declare enum TicketCategory {
    ORDER = "order",
    QUOTE = "quote",
    PRODUCT = "product",
    BILLING = "billing",
    TECHNICAL = "technical",
    OTHER = "other"
}
export declare class CreateTicketDto {
    subject: string;
    message: string;
    priority?: TicketPriority;
    category?: TicketCategory;
    orderId?: string;
}
