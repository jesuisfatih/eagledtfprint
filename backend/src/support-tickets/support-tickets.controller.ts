import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketsController {
  constructor(private supportTicketsService: SupportTicketsService) {}

  // Get tickets
  @Get()
  async getTickets(
    @CurrentUser('sub') userId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('merchantId') merchantId: string,
    @CurrentUser('role') role: string,
    @Query('userId') queryUserId?: string,
  ) {
    // Admin gets all tickets
    if (role === 'admin' || role === 'merchant_admin') {
      return this.supportTicketsService.getAllTickets(merchantId);
    }

    // If specific user's tickets requested
    if (queryUserId) {
      return this.supportTicketsService.getTicketsByUser(queryUserId, merchantId);
    }

    // Get own tickets
    return this.supportTicketsService.getTicketsByUser(userId, merchantId);
  }

  // Create new ticket
  @Post()
  async createTicket(
    @CurrentUser('sub') userId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: CreateTicketDto,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.supportTicketsService.createTicket(
      userId,
      companyId,
      merchantId,
      dto,
    );
  }

  // Get ticket detail
  @Get(':id')
  async getTicket(@Param('id') id: string) {
    return this.supportTicketsService.getTicketById(id);
  }

  // Update ticket (status, add response)
  @Put(':id')
  async updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.supportTicketsService.updateTicket(id, dto);
  }

  // Add response to ticket
  @Post(':id/responses')
  async addResponse(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Body('message') message: string,
  ) {
    if (!message) {
      throw new BadRequestException('Message required');
    }

    const isAdmin = role === 'admin' || role === 'merchant_admin';
    const userName = isAdmin ? 'Support Staff' : 'Customer';
    return this.supportTicketsService.addResponse(id, userId, userName, message, isAdmin);
  }

  // Stats (for admin)
  @Get('stats/overview')
  async getStats(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    return this.supportTicketsService.getTicketStats(merchantId);
  }
}
