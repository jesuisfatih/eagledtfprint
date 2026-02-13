import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DittofeedService } from './dittofeed.service';

@Controller('api/v1/dittofeed')
@UseGuards(JwtAuthGuard)
export class DittofeedController {
  constructor(private readonly dittofeedService: DittofeedService) {}

  // ─── Full sync: companies + users ───
  @Post('sync/companies')
  async syncCompanies(@Req() req: any) {
    const merchantId = req.user.merchantId;
    const result = await this.dittofeedService.syncAllCompanies(merchantId);
    return { success: true, ...result };
  }

  // ─── Sync intelligence traits ───
  @Post('sync/intelligence')
  async syncIntelligence(@Req() req: any) {
    const merchantId = req.user.merchantId;
    const result = await this.dittofeedService.syncCompanyIntelligence(merchantId);
    return { success: true, ...result };
  }

  // ─── Sync recent orders ───
  @Post('sync/orders')
  async syncOrders(@Req() req: any, @Query('hours') hours?: string) {
    const merchantId = req.user.merchantId;
    const result = await this.dittofeedService.syncOrders(merchantId, Number(hours) || 24);
    return { success: true, ...result };
  }

  // ─── Sync visitor events ───
  @Post('sync/events')
  async syncEvents(@Req() req: any, @Query('hours') hours?: string) {
    const merchantId = req.user.merchantId;
    const result = await this.dittofeedService.syncVisitorEvents(merchantId, Number(hours) || 24);
    return { success: true, ...result };
  }

  // ─── Full sync: everything ───
  @Post('sync/all')
  async syncAll(@Req() req: any) {
    const merchantId = req.user.merchantId;

    const companies = await this.dittofeedService.syncAllCompanies(merchantId);
    const intelligence = await this.dittofeedService.syncCompanyIntelligence(merchantId);
    const orders = await this.dittofeedService.syncOrders(merchantId, 720); // last 30 days
    const events = await this.dittofeedService.syncVisitorEvents(merchantId, 720);

    return {
      success: true,
      companies: companies.synced,
      intelligence: intelligence.synced,
      orders: orders.synced,
      events: events.synced,
    };
  }

  // ─── Get Dittofeed dashboard URL for iframe embed ───
  @Get('dashboard-url')
  getDashboardUrl() {
    const host = process.env.DITTOFEED_HOST || 'http://localhost:3010';
    return { url: host };
  }
}
