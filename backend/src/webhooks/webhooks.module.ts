import { Module } from '@nestjs/common';
import { PickupModule } from '../pickup/pickup.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { CustomersHandler } from './handlers/customers.handler';
import { OrdersHandler } from './handlers/orders.handler';
import { ShopifyWebhookSyncService } from './shopify-webhook-sync.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [ShopifyModule, PickupModule],
  controllers: [WebhooksController],
  providers: [OrdersHandler, CustomersHandler, ShopifyWebhookSyncService],
})
export class WebhooksModule {}
