import { Controller, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    
    // Security: Company users can only see their own company's orders
    // Admin/merchant can see all or filter by company
    let companyId = queryCompanyId;
    
    if (userCompanyId) {
      // User is a company user - force their companyId filter
      companyId = userCompanyId;
    }
    
    return this.ordersService.findAll(merchantId, { companyId, status });
  }

  @Get('stats')
  async getStats(
    @CurrentUser('merchantId') merchantId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    // If user has companyId, get stats for their company only
    return this.ordersService.getStats(merchantId, companyId);
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
    // Pass companyId to ensure user can only access their company's orders
    return this.ordersService.findOne(id, merchantId, companyId);
  }
}




