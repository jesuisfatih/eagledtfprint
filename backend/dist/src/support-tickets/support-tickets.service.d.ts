import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
export declare class SupportTicketsService {
    private prisma;
    private ticketCounter;
    constructor(prisma: PrismaService);
    private initTicketCounter;
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
    getTicketsByUser(userId: string, merchantId: string): Promise<({
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
    getTicketsByCompany(companyId: string, merchantId: string): Promise<({
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
    getAllTickets(merchantId: string): Promise<({
        company: {
            name: string;
            id: string;
        };
        companyUser: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
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
    getTicketById(id: string): Promise<{
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
    addResponse(ticketId: string, userId: string, userName: string, message: string, isAdmin?: boolean): Promise<{
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
    getTicketStats(merchantId: string): Promise<{
        total: number;
        open: number;
        inProgress: number;
        resolved: number;
        avgResponseTime: number;
    }>;
}
