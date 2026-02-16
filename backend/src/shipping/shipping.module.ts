import { Module } from '@nestjs/common';
import { DittofeedModule } from '../dittofeed/dittofeed.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [PrismaModule, DittofeedModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
