import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShippingService } from './shipping.service';

@Controller('shipping')
@UseGuards(JwtAuthGuard)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RATES & LABELS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Get shipping rates for an order */
  @Post('rates')
  async getRates(
    @CurrentUser('merchantId') merchantId: string,
    @Body() body: any,
  ) {
    return this.shippingService.getRates({ ...body, merchantId });
  }

  /** Create shipment & generate label */
  @Post('ship')
  async createShipment(
    @CurrentUser('merchantId') merchantId: string,
    @Body() body: any,
  ) {
    return this.shippingService.createShipment({ ...body, merchantId });
  }

  /** Batch ship multiple orders */
  @Post('ship/batch')
  async batchShip(
    @CurrentUser('merchantId') merchantId: string,
    @Body() body: { orderIds: string[] },
  ) {
    return this.shippingService.createBatchShipments(merchantId, body.orderIds);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INTELLIGENT ROUTING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Get pickup vs ship recommendation */
  @Get('routing/:orderId')
  async getRouting(
    @CurrentUser('merchantId') merchantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.shippingService.getIntelligentRouting(orderId, merchantId);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TRACKING WEBHOOK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** EasyPost tracking webhook */
  @Public()
  @Post('webhooks/tracking')
  @HttpCode(200)
  async trackingWebhook(@Body() body: any) {
    return this.shippingService.handleTrackingWebhook(body);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHELF CAPACITY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Get shelf capacity status */
  @Get('shelf-capacity')
  async getShelfCapacity(@CurrentUser('merchantId') merchantId: string) {
    return this.shippingService.getShelfCapacity(merchantId);
  }

  /** Get stale pickup orders */
  @Get('stale-pickups')
  async getStalePickups(
    @CurrentUser('merchantId') merchantId: string,
    @Query('days') days?: string,
  ) {
    const parsedDays = days ? parseInt(days, 10) : 5;
    return this.shippingService.getStalePickupOrders(merchantId, Number.isFinite(parsedDays) ? parsedDays : 5);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ANALYTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Shipping vs Pickup stats */
  @Get('stats')
  async getStats(@CurrentUser('merchantId') merchantId: string) {
    return this.shippingService.getShippingStats(merchantId);
  }
}
