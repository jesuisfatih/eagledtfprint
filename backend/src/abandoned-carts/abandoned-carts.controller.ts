import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AbandonedCartsService } from './abandoned-carts.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TrackCartDto, SyncCartDto, GetAbandonedCartsQueryDto } from './dto/abandoned-cart.dto';

@Controller('abandoned-carts')
export class AbandonedCartsController {
  constructor(private abandonedCartsService: AbandonedCartsService) {}

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAbandonedCarts(
    @CurrentUser('merchantId') merchantId: string,
    @Query() query: GetAbandonedCartsQueryDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    
    return this.abandonedCartsService.getAbandonedCarts(merchantId, query.companyId, query.includeRecent);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('my-carts')
  async getMyAbandonedCarts(
    @CurrentUser('merchantId') merchantId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!merchantId || !companyId) {
      throw new BadRequestException('Merchant ID and Company ID required');
    }
    return this.abandonedCartsService.getAbandonedCarts(merchantId, companyId);
  }

  // Public endpoints for snippet tracking - STRICT RATE LIMITING + DTO VALIDATION
  @Public()
  @Throttle({ short: { limit: 5, ttl: 1000 }, medium: { limit: 20, ttl: 10000 } })
  @Post('sync')
  async syncCart(@Body() dto: SyncCartDto) {
    return this.abandonedCartsService.syncShopifyCart(dto);
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: 1000 }, medium: { limit: 30, ttl: 10000 } })
  @Post('track')
  async trackCart(@Body() dto: TrackCartDto) {
    console.log('📦 Cart tracking received:', {
      cartToken: dto.cartToken,
      itemCount: dto.items?.length || 0,
      customerEmail: dto.customerEmail,
    });
    try {
      const result = await this.abandonedCartsService.trackCart(dto);
      console.log('✅ Cart tracked successfully:', result.id);
      return result;
    } catch (error: any) {
      console.error('❌ Cart tracking failed:', error.message);
      return {
        statusCode: 500,
        message: error.message || 'Internal server error',
        error: 'Cart tracking failed',
      };
    }
  }

  @Public()
  @Throttle({ short: { limit: 5, ttl: 1000 } })
  @Get('activity/:cartId')
  async getCartActivity(@Param('cartId') cartId: string) {
    return this.abandonedCartsService.getCartActivityLogs(cartId);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('activity')
  async getAllCartActivity(
    @CurrentUser('merchantId') merchantId: string,
    @Query('limit') limit?: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.abandonedCartsService.getAllCartActivityLogs(merchantId, limit ? parseInt(limit) : 100);
  }

  /**
   * Mark an abandoned cart as restored
   */
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post(':id/restore')
  async restoreCart(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    return this.abandonedCartsService.markAsRestored(id, merchantId);
  }

  /**
   * Delete an abandoned cart
   */
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCart(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    return this.abandonedCartsService.deleteCart(id, merchantId);
  }
}

