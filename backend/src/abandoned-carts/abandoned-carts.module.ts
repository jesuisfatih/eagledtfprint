import { Module } from '@nestjs/common';
import { AbandonedCartsService } from './abandoned-carts.service';
import { AbandonedCartsController } from './abandoned-carts.controller';

@Module({
  controllers: [AbandonedCartsController],
  providers: [AbandonedCartsService],
  exports: [AbandonedCartsService],
})
export class AbandonedCartsModule {}

