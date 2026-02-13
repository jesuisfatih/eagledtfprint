import { Injectable } from '@nestjs/common';
import { PricingCalculatorService } from './pricing-calculator.service';
import { PricingRulesService } from './pricing-rules.service';

@Injectable()
export class PricingService {
  constructor(
    private calculator: PricingCalculatorService,
    private rulesService: PricingRulesService,
  ) {}

  // Expose calculator methods
  async calculatePrices(context: any) {
    return this.calculator.calculatePrices(context);
  }

  async calculateCartPricing(cartId: string) {
    return this.calculator.calculateCartPricing(cartId);
  }

  // Expose rules methods
  async createRule(merchantId: string, dto: any) {
    return this.rulesService.create(merchantId, dto);
  }

  async getRules(merchantId: string, filters?: any) {
    return this.rulesService.findAll(merchantId, filters);
  }

  async getRule(id: string, merchantId: string) {
    return this.rulesService.findOne(id, merchantId);
  }

  async updateRule(id: string, merchantId: string, dto: any) {
    return this.rulesService.update(id, merchantId, dto);
  }

  async deleteRule(id: string, merchantId: string) {
    return this.rulesService.delete(id, merchantId);
  }

  async toggleRuleActive(id: string, merchantId: string, isActive: boolean) {
    return this.rulesService.toggleActive(id, merchantId, isActive);
  }
}




