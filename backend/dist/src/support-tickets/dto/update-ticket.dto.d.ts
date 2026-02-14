export declare enum TicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    WAITING = "waiting",
    RESOLVED = "resolved",
    CLOSED = "closed"
}
export declare class UpdateTicketDto {
    status?: TicketStatus;
    response?: string;
    assignedTo?: string;
}
