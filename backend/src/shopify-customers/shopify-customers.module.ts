import { Module } from '@nestjs/common';
import { CustomerIntelligenceService } from '../customers/customer-intelligence.service';
import { CustomerListsController } from '../customers/customer-lists.controller';
import { CustomerListsService } from '../customers/customer-lists.service';
import { ProactiveOfferController } from '../customers/proactive-offer.controller';
import { ProactiveOfferService } from '../customers/proactive-offer.service';
import { ShopifyCustomersController } from './shopify-customers.controller';
import { ShopifyCustomersService } from './shopify-customers.service';

import { DittofeedModule } from '../dittofeed/dittofeed.module';

@Module({
  imports: [DittofeedModule],
  controllers: [ShopifyCustomersController, ProactiveOfferController, CustomerListsController],
  providers: [ShopifyCustomersService, CustomerIntelligenceService, ProactiveOfferService, CustomerListsService],
  exports: [ShopifyCustomersService, CustomerIntelligenceService, ProactiveOfferService, CustomerListsService],
})
export class ShopifyCustomersModule {}
