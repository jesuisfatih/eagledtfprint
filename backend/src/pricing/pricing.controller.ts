import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalculatePricesDto, CreatePricingRuleDto, GetRulesQueryDto, ToggleRuleDto, UpdatePricingRuleDto } from './dto/pricing.dto';
import { PricingService } from './pricing.service';

@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private pricingService: PricingService) {}

  // Calculate prices for variants
  @Post('calculate')
  async calculatePrices(
    @CurrentUser('merchantId') merchantId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CalculatePricesDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    if (!companyId) {
      throw new BadRequestException('Company ID required');
    }
    const variantIds = dto.variantIds.map((id) => BigInt(id));

    return this.pricingService.calculatePrices({
      merchantId,
      companyId,
      variantIds,
      quantities: dto.quantities,
      cartTotal: dto.cartTotal,
    });
  }

  // Pricing Rules Management
  @Get('rules')
  async getRules(
    @CurrentUser('merchantId') merchantId: string,
    @Query() query: GetRulesQueryDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    const filters: any = {};
    if (query.isActive !== undefined) {
      filters.isActive = query.isActive === 'true';
    }
    if (query.companyId) {
      filters.companyId = query.companyId;
    }
    if (query.companyUserId) {
      filters.companyUserId = query.companyUserId;
    }
    if (query.targetType) {
      filters.targetType = query.targetType;
    }

    return this.pricingService.getRules(merchantId, filters);
  }

  @Get('rules/:id')
  async getRule(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.pricingService.getRule(id, merchantId);
  }

  @Post('rules')
  async createRule(
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: CreatePricingRuleDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.pricingService.createRule(merchantId, dto);
  }

  @Put('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: UpdatePricingRuleDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.pricingService.updateRule(id, merchantId, dto);
  }

  @Delete('rules/:id')
  async deleteRule(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.pricingService.deleteRule(id, merchantId);
  }

  @Put('rules/:id/toggle')
  async toggleRule(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: ToggleRuleDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.pricingService.toggleRuleActive(id, merchantId, dto.isActive);
  }
}
