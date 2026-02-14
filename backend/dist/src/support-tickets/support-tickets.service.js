"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicketsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const create_ticket_dto_1 = require("./dto/create-ticket.dto");
const update_ticket_dto_1 = require("./dto/update-ticket.dto");
let SupportTicketsService = class SupportTicketsService {
    prisma;
    ticketCounter = 1000;
    constructor(prisma) {
        this.prisma = prisma;
        this.initTicketCounter();
    }
    async initTicketCounter() {
        const lastTicket = await this.prisma.supportTicket.findFirst({
            orderBy: { createdAt: 'desc' },
        });
        if (lastTicket) {
            const num = parseInt(lastTicket.ticketNumber.replace('TKT-', ''), 10);
            if (!isNaN(num)) {
                this.ticketCounter = num;
            }
        }
    }
    async createTicket(userId, companyId, merchantId, dto) {
        return this.prisma.supportTicket.create({
            data: {
                ticketNumber: `TKT-${++this.ticketCounter}`,
                merchantId,
                companyId,
                companyUserId: userId,
                subject: dto.subject,
                description: dto.message,
                priority: dto.priority || create_ticket_dto_1.TicketPriority.MEDIUM,
                category: dto.category || create_ticket_dto_1.TicketCategory.OTHER,
                status: update_ticket_dto_1.TicketStatus.OPEN,
                orderId: dto.orderId,
            },
            include: { responses: true },
        });
    }
    async getTicketsByUser(userId, merchantId) {
        return this.prisma.supportTicket.findMany({
            where: { companyUserId: userId, merchantId },
            include: { responses: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTicketsByCompany(companyId, merchantId) {
        return this.prisma.supportTicket.findMany({
            where: { companyId, merchantId },
            include: { responses: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAllTickets(merchantId) {
        return this.prisma.supportTicket.findMany({
            where: { merchantId },
            include: {
                responses: true,
                company: { select: { id: true, name: true } },
                companyUser: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTicketById(id) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id },
            include: { responses: true },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        return ticket;
    }
    async updateTicket(id, dto) {
        const ticket = await this.getTicketById(id);
        const updateData = { updatedAt: new Date() };
        if (dto.status) {
            updateData.status = dto.status;
            if (dto.status === update_ticket_dto_1.TicketStatus.RESOLVED) {
                updateData.resolvedAt = new Date();
            }
        }
        const updatedTicket = await this.prisma.supportTicket.update({
            where: { id },
            data: updateData,
            include: { responses: true },
        });
        if (dto.response) {
            await this.prisma.ticketResponse.create({
                data: {
                    ticketId: id,
                    message: dto.response,
                    isStaffReply: true,
                    responderId: dto.assignedTo || 'admin',
                    responderName: 'Support Staff',
                    responderType: 'staff',
                },
            });
        }
        return this.getTicketById(id);
    }
    async addResponse(ticketId, userId, userName, message, isAdmin = false) {
        await this.prisma.ticketResponse.create({
            data: {
                ticketId,
                message,
                isStaffReply: isAdmin,
                responderId: userId,
                responderName: userName,
                responderType: isAdmin ? 'staff' : 'user',
            },
        });
        await this.prisma.supportTicket.update({
            where: { id: ticketId },
            data: { updatedAt: new Date() },
        });
        return this.getTicketById(ticketId);
    }
    async getTicketStats(merchantId) {
        const [total, open, inProgress, resolved] = await Promise.all([
            this.prisma.supportTicket.count({ where: { merchantId } }),
            this.prisma.supportTicket.count({ where: { merchantId, status: 'open' } }),
            this.prisma.supportTicket.count({ where: { merchantId, status: 'in_progress' } }),
            this.prisma.supportTicket.count({ where: { merchantId, status: 'resolved' } }),
        ]);
        return {
            total,
            open,
            inProgress,
            resolved,
            avgResponseTime: 0,
        };
    }
};
exports.SupportTicketsService = SupportTicketsService;
exports.SupportTicketsService = SupportTicketsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupportTicketsService);
//# sourceMappingURL=support-tickets.service.js.map