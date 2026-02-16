import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.analyticsService.getDashboardStats(merchantId);
  }

  @Get('funnel')
  async getFunnel(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.analyticsService.getConversionFunnel(merchantId);
  }

  @Get('top-products')
  async getTopProducts(
    @CurrentUser('merchantId') merchantId: string,
    @Query('limit') limit?: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getTopProducts(merchantId, Number.isFinite(parsedLimit) ? parsedLimit : 10);
  }

  @Get('top-companies')
  async getTopCompanies(
    @CurrentUser('merchantId') merchantId: string,
    @Query('limit') limit?: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getTopCompanies(merchantId, Number.isFinite(parsedLimit) ? parsedLimit : 10);
  }
}
