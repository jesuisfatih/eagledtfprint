import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
export declare class SupportTicketsController {
    private supportTicketsService;
    constructor(supportTicketsService: SupportTicketsService);
    getTickets(userId: string, companyId: string, merchantId: string, role: string, queryUserId?: string): Promise<({
        responses: {
            id: string;
            createdAt: Date;
            message: string;
            isStaffReply: boolean;
            responderId: string;
            responderName: string;
            responderType: string;
            ticketId: string;
        }[];
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        description: string;
        companyId: string;
        companyUserId: string;
        priority: string;
        ticketNumber: string;
        subject: string;
        category: string;
        orderId: string | null;
        resolvedAt: Date | null;
    })[]>;
    createTicket(userId: string, companyId: string, merchantId: string, dto: CreateTicketDto): Promise<{
        responses: {
            id: string;
            createdAt: Date;
            message: string;
            isStaffReply: boolean;
            responderId: string;
            responderName: string;
            responderType: string;
            ticketId: string;
        }[];
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        description: string;
        companyId: string;
        companyUserId: string;
        priority: string;
        ticketNumber: string;
        subject: string;
        category: string;
        orderId: string | null;
        resolvedAt: Date | null;
    }>;
    getTicket(id: string): Promise<{
        responses: {
            id: string;
            createdAt: Date;
            message: string;
            isStaffReply: boolean;
            responderId: string;
            responderName: string;
            responderType: string;
            ticketId: string;
        }[];
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        description: string;
        companyId: string;
        companyUserId: string;
        priority: string;
        ticketNumber: string;
        subject: string;
        category: string;
        orderId: string | null;
        resolvedAt: Date | null;
    }>;
    updateTicket(id: string, dto: UpdateTicketDto): Promise<{
        responses: {
            id: string;
            createdAt: Date;
            message: string;
            isStaffReply: boolean;
            responderId: string;
            responderName: string;
            responderType: string;
            ticketId: string;
        }[];
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        description: string;
        companyId: string;
        companyUserId: string;
        priority: string;
        ticketNumber: string;
        subject: string;
        category: string;
        orderId: string | null;
        resolvedAt: Date | null;
    }>;
    addResponse(id: string, userId: string, role: string, message: string): Promise<{
        responses: {
            id: string;
            createdAt: Date;
            message: string;
            isStaffReply: boolean;
            responderId: string;
            responderName: string;
            responderType: string;
            ticketId: string;
        }[];
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        description: string;
        companyId: string;
        companyUserId: string;
        priority: string;
        ticketNumber: string;
        subject: string;
        category: string;
        orderId: string | null;
        resolvedAt: Date | null;
    }>;
    getStats(merchantId: string): Promise<{
        total: number;
        open: number;
        inProgress: number;
        resolved: number;
        avgResponseTime: number;
    }>;
}
