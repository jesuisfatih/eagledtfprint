import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CheckoutService } from './checkout.service';
import { DiscountEngineService } from './discount-engine.service';
import { CheckoutController } from './checkout.controller';
import { ShopifyModule } from '../shopify/shopify.module';
import { CartsModule } from '../carts/carts.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [HttpModule, ShopifyModule, CartsModule, PricingModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, DiscountEngineService],
  exports: [CheckoutService, DiscountEngineService],
})
export class CheckoutModule {}




