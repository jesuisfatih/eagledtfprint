import { Module } from '@nestjs/common';
import { DittofeedModule } from '../dittofeed/dittofeed.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EventBusService } from './event-bus.service';

@Module({
  imports: [PrismaModule, DittofeedModule],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
