import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateQuoteDto } from './dto/quote.dto';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Get()
  async findAll(@CurrentUser('companyId') companyId: string) {
    if (!companyId) {
      throw new BadRequestException('Company ID required');
    }
    return this.quotesService.findAll(companyId);
  }

  @Post()
  async create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateQuoteDto,
  ) {
    if (!companyId || !userId) {
      throw new BadRequestException('Company ID and User ID required');
    }
    return this.quotesService.create(companyId, userId, dto);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.quotesService.approve(id, userId);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    return this.quotesService.reject(id);
  }

  @Post(':id/send-email')
  async sendEmail(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.quotesService.sendQuoteEmail(id, merchantId);
  }
}
