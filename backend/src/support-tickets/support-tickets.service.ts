import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto, TicketPriority, TicketCategory } from './dto/create-ticket.dto';
import { UpdateTicketDto, TicketStatus } from './dto/update-ticket.dto';

@Injectable()
export class SupportTicketsService {
  private ticketCounter = 1000;

  constructor(private prisma: PrismaService) {
    // Initialize ticket counter from database
    this.initTicketCounter();
  }

  private async initTicketCounter() {
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

  async createTicket(
    userId: string,
    companyId: string,
    merchantId: string,
    dto: CreateTicketDto,
  ) {
    return this.prisma.supportTicket.create({
      data: {
        ticketNumber: `TKT-${++this.ticketCounter}`,
        merchantId,
        companyId,
        companyUserId: userId,
        subject: dto.subject,
        description: dto.message,
        priority: dto.priority || TicketPriority.MEDIUM,
        category: dto.category || TicketCategory.OTHER,
        status: TicketStatus.OPEN,
        orderId: dto.orderId,
      },
      include: { responses: true },
    });
  }

  async getTicketsByUser(userId: string, merchantId: string) {
    return this.prisma.supportTicket.findMany({
      where: { companyUserId: userId, merchantId },
      include: { responses: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicketsByCompany(companyId: string, merchantId: string) {
    return this.prisma.supportTicket.findMany({
      where: { companyId, merchantId },
      include: { responses: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllTickets(merchantId: string) {
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

  async getTicketById(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { responses: true },
    });
    
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    
    return ticket;
  }

  async updateTicket(id: string, dto: UpdateTicketDto) {
    const ticket = await this.getTicketById(id);

    const updateData: any = { updatedAt: new Date() };

    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === TicketStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      }
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: { responses: true },
    });

    // Add response if provided
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

  async addResponse(
    ticketId: string,
    userId: string,
    userName: string,
    message: string,
    isAdmin: boolean = false,
  ) {
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

  async getTicketStats(merchantId: string) {
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
      avgResponseTime: 0, // TODO: Calculate from responses
    };
  }
}
