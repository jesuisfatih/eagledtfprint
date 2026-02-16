import { Module } from '@nestjs/common';
import { DittofeedModule } from '../dittofeed/dittofeed.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PickupController } from './pickup.controller';
import { PickupService } from './pickup.service';

@Module({
  imports: [PrismaModule, DittofeedModule],
  controllers: [PickupController],
  providers: [PickupService],
  exports: [PickupService],
})
export class PickupModule {}
