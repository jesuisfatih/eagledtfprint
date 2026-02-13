import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProactiveOfferService } from './proactive-offer.service';

@Controller('offers')
@UseGuards(JwtAuthGuard)
export class ProactiveOfferController {
  constructor(private offerService: ProactiveOfferService) {}

  /**
   * Get all offers for the merchant (admin)
   */
  @Get()
  async getOffers(
    @CurrentUser('merchantId') merchantId: string,
    @Query('status') status?: string,
    @Query('strategy') strategy?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.offerService.getMerchantOffers(merchantId, {
      status,
      strategy,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  /**
   * Get offer analytics/dashboard
   */
  @Get('analytics')
  async getAnalytics(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.offerService.getOfferAnalytics(merchantId);
  }

  /**
   * Get active offers for a specific customer
   */
  @Get('customer/:customerId')
  async getCustomerOffers(
    @Param('customerId') customerId: string,
  ) {
    return this.offerService.getCustomerOffers(customerId);
  }

  /**
   * Manually trigger offer generation
   */
  @Post('generate')
  async generateOffers(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.offerService.generateOffers(merchantId);
  }

  /**
   * Mark an offer as viewed
   */
  @Post(':id/view')
  async markViewed(@Param('id') id: string) {
    return this.offerService.markViewed(id);
  }

  /**
   * Mark an offer as accepted
   */
  @Post(':id/accept')
  async markAccepted(@Param('id') id: string) {
    return this.offerService.markAccepted(id);
  }

  /**
   * Record offer redemption
   */
  @Post(':id/redeem')
  async markRedeemed(
    @Param('id') id: string,
    @Body() body: { orderId: string; revenue: number },
  ) {
    return this.offerService.markRedeemed(id, body.orderId, body.revenue);
  }

  /**
   * Cancel an offer
   */
  @Post(':id/cancel')
  async cancelOffer(@Param('id') id: string) {
    return this.offerService.cancelOffer(id);
  }

  /**
   * Expire all old offers for merchant
   */
  @Post('expire')
  async expireOldOffers(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    const expired = await this.offerService.expireOldOffers(merchantId);
    return { expired };
  }
}
