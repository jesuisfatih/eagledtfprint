import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ShopifyModule } from '../shopify/shopify.module';
import { SyncStateService } from './sync-state.service';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { CustomersSyncWorker } from './workers/customers-sync.worker';
import { OrdersSyncWorker } from './workers/orders-sync.worker';
import { ProductsSyncWorker } from './workers/products-sync.worker';

@Module({
  imports: [
    HttpModule,
    ShopifyModule,
    BullModule.registerQueue(
      {
        name: 'customers-sync',
      },
      {
        name: 'products-sync',
      },
      {
        name: 'orders-sync',
      },
    ),
  ],
  controllers: [SyncController],
  providers: [
    SyncService,
    SyncStateService,
    CustomersSyncWorker,
    ProductsSyncWorker,
    OrdersSyncWorker,
  ],
  exports: [SyncService, SyncStateService],
})
export class SyncModule {}
