import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartItemsService } from './cart-items.service';
import { CartsController } from './carts.controller';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PricingModule],
  controllers: [CartsController],
  providers: [CartsService, CartItemsService],
  exports: [CartsService],
})
export class CartsModule {}




