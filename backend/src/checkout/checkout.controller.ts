import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post('create')
  async createCheckout(
    @CurrentUser('sub') userId: string,
    @Body() body: { cartId: string },
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.checkoutService.createCheckout(body.cartId, userId);
  }
}




