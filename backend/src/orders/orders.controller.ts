import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  async findAll(
    @CurrentUser('merchantId') merchantId: string,
    @CurrentUser('companyId') userCompanyId: string,
    @CurrentUser('role') role: string,
    @Query('companyId') queryCompanyId?: string,
    @Query('status') status?: string,
    @Query('pickupOnly') pickupOnly?: string,
    @Query('hasDesignFiles') hasDesignFiles?: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }

    let companyId = queryCompanyId;

    if (userCompanyId) {
      companyId = userCompanyId;
    }

    return this.ordersService.findAll(merchantId, {
      companyId,
      status,
      pickupOnly: pickupOnly === 'true',
      hasDesignFiles: hasDesignFiles === 'true',
    });
  }

  @Get('stats')
  async getStats(
    @CurrentUser('merchantId') merchantId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.ordersService.getStats(merchantId, companyId);
  }

  // ===================================================
  // CUSTOMER JOURNEY — Full lifecycle for a single customer
  // ===================================================
  @Get('journey/:shopifyCustomerId')
  async getCustomerJourney(
    @CurrentUser('merchantId') merchantId: string,
    @Param('shopifyCustomerId') shopifyCustomerId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.ordersService.getCustomerJourney(merchantId, shopifyCustomerId);
  }

  // ===================================================
  // JOURNEY FUNNEL — Aggregate conversion funnel
  // ===================================================
  @Get('journey-funnel')
  async getJourneyFunnel(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.ordersService.getJourneyFunnel(merchantId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.ordersService.findOne(id, merchantId, companyId);
  }
}
