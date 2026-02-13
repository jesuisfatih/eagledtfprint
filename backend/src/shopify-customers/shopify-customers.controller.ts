import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerIntelligenceService } from '../customers/customer-intelligence.service';
import { ShopifyCustomersService } from './shopify-customers.service';

@Controller('shopify-customers')
@UseGuards(JwtAuthGuard)
export class ShopifyCustomersController {
  constructor(
    private shopifyCustomersService: ShopifyCustomersService,
    private customerIntelligence: CustomerIntelligenceService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser('merchantId') merchantId: string,
    @Query('search') search?: string,
    @Query('segment') segment?: string,
    @Query('churnRisk') churnRisk?: string,
    @Query('clvTier') clvTier?: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.shopifyCustomersService.findAll(merchantId, {
      search,
      segment,
      churnRisk,
      clvTier,
    });
  }

  @Get('insights/summary')
  async getInsightsSummary(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.customerIntelligence.getInsightsSummary(merchantId);
  }

  @Get('insights/at-risk')
  async getAtRiskCustomers(
    @CurrentUser('merchantId') merchantId: string,
    @Query('limit') limit?: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.customerIntelligence.getAtRiskCustomers(merchantId, limit ? parseInt(limit) : 50);
  }

  @Get('insights/segment/:segment')
  async getBySegment(
    @CurrentUser('merchantId') merchantId: string,
    @Param('segment') segment: string,
    @Query('limit') limit?: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.customerIntelligence.getCustomersBySegment(merchantId, segment, limit ? parseInt(limit) : 50);
  }

  @Post('insights/calculate')
  async calculateInsights(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.customerIntelligence.calculateInsights(merchantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shopifyCustomersService.findOne(id);
  }

  @Post(':id/convert-to-company')
  async convertToCompany(
    @Param('id') customerId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.shopifyCustomersService.convertToCompany(customerId, merchantId);
  }
}
