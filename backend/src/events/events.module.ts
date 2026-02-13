import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventsProcessorWorker } from './workers/events-processor.worker';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'events-raw-queue',
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    ShopifyModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, EventsProcessorWorker],
  exports: [EventsService],
})
export class EventsModule {}




