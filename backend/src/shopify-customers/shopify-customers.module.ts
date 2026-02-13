import { Module } from '@nestjs/common';
import { CustomerIntelligenceService } from '../customers/customer-intelligence.service';
import { ProactiveOfferController } from '../customers/proactive-offer.controller';
import { ProactiveOfferService } from '../customers/proactive-offer.service';
import { ShopifyCustomersController } from './shopify-customers.controller';
import { ShopifyCustomersService } from './shopify-customers.service';

@Module({
  controllers: [ShopifyCustomersController, ProactiveOfferController],
  providers: [ShopifyCustomersService, CustomerIntelligenceService, ProactiveOfferService],
  exports: [ShopifyCustomersService, CustomerIntelligenceService, ProactiveOfferService],
})
export class ShopifyCustomersModule {}
