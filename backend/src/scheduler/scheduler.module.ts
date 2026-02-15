import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventBusModule } from '../event-bus/event-bus.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopifyCustomersModule } from '../shopify-customers/shopify-customers.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { SyncModule } from '../sync/sync.module';
import { MarketingScheduler } from './marketing.scheduler';
import { SyncScheduler } from './sync.scheduler';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SyncModule,
    ShopifyCustomersModule,
    ShopifyModule,
    PrismaModule,
    EventBusModule,
  ],
  providers: [SyncScheduler, MarketingScheduler],
})
export class SchedulerModule {}
