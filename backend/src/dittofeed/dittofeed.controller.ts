import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DittofeedService } from './dittofeed.service';

@Controller('api/v1/dittofeed')
@UseGuards(JwtAuthGuard)
export class DittofeedController {
  constructor(private readonly dittofeedService: DittofeedService) {}

  // ─── Full sync: companies + users ───
  @Post('sync/companies')
  async syncCompanies(@CurrentUser('merchantId') merchantId: string) {
    const result = await this.dittofeedService.syncAllCompanies(merchantId);
    return { success: true, ...result };
  }

  // ─── Sync intelligence traits ───
  @Post('sync/intelligence')
  async syncIntelligence(@CurrentUser('merchantId') merchantId: string) {
    const result = await this.dittofeedService.syncCompanyIntelligence(merchantId);
    return { success: true, ...result };
  }

  // ─── Sync recent orders ───
  @Post('sync/orders')
  async syncOrders(
    @CurrentUser('merchantId') merchantId: string,
    @Query('hours') hours?: string,
  ) {
    const result = await this.dittofeedService.syncOrders(merchantId, Number(hours) || 24);
    return { success: true, ...result };
  }

  // ─── Sync visitor events ───
  @Post('sync/events')
  async syncEvents(
    @CurrentUser('merchantId') merchantId: string,
    @Query('hours') hours?: string,
  ) {
    const result = await this.dittofeedService.syncVisitorEvents(merchantId, Number(hours) || 24);
    return { success: true, ...result };
  }

  // ─── Sync customer insights (CLV/RFM/Health) ───
  @Post('sync/insights')
  async syncInsights(@CurrentUser('merchantId') merchantId: string) {
    const result = await this.dittofeedService.syncCustomerInsights(merchantId);
    return { success: true, ...result };
  }

  // ─── Full sync: everything ───
  @Post('sync/all')
  async syncAll(@CurrentUser('merchantId') merchantId: string) {
    const companies = await this.dittofeedService.syncAllCompanies(merchantId);
    const intelligence = await this.dittofeedService.syncCompanyIntelligence(merchantId);
    const orders = await this.dittofeedService.syncOrders(merchantId, 720); // last 30 days
    const events = await this.dittofeedService.syncVisitorEvents(merchantId, 720);
    const insights = await this.dittofeedService.syncCustomerInsights(merchantId);

    return {
      success: true,
      companies: companies.synced,
      intelligence: intelligence.synced,
      orders: orders.synced,
      events: events.synced,
      insights: insights.synced,
    };
  }

  // ─── Get Dittofeed dashboard URL for iframe embed ───
  @Get('dashboard-url')
  getDashboardUrl() {
    const host = process.env.DITTOFEED_HOST || 'http://multiservice-dittofeed:3010';
    return { url: host };
  }
}
