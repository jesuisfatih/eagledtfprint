import { Module } from '@nestjs/common';
import { DittofeedModule } from '../dittofeed/dittofeed.module';
import { PickupModule } from '../pickup/pickup.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { CustomersHandler } from './handlers/customers.handler';
import { OrdersHandler } from './handlers/orders.handler';
import { ShopifyWebhookSyncService } from './shopify-webhook-sync.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [ShopifyModule, PickupModule, DittofeedModule],
  controllers: [WebhooksController],
  providers: [OrdersHandler, CustomersHandler, ShopifyWebhookSyncService],
})
export class WebhooksModule {}
