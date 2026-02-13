import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingRulesService } from './pricing-rules.service';
import { PricingCalculatorService } from './pricing-calculator.service';
import { PricingController } from './pricing.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PricingController],
  providers: [PricingService, PricingRulesService, PricingCalculatorService, PrismaService],
  exports: [PricingService, PricingCalculatorService, PricingRulesService],
})
export class PricingModule {}




