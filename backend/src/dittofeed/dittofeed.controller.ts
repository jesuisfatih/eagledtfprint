import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CrossSellService } from './cross-sell.service';
import { DittofeedAdminService } from './dittofeed-admin.service';
import { DittofeedDbReaderService } from './dittofeed-db-reader.service';
import { DittofeedService } from './dittofeed.service';

@Controller('dittofeed')
@UseGuards(JwtAuthGuard)
export class DittofeedController {
  constructor(
    private readonly dittofeedService: DittofeedService,
    private readonly prisma: PrismaService,
    private readonly adminService: DittofeedAdminService,
    private readonly crossSellService: CrossSellService,
    private readonly dbReader: DittofeedDbReaderService,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SYNC ENDPOINTS (Admin Panel → Backend)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Sync all companies + users to Dittofeed */
  @Post('sync/companies')
  async syncCompanies(@CurrentUser('merchantId') merchantId: string) {
    const result = await this.dittofeedService.syncAllCompanies(merchantId);
    return { success: true, ...result };
  }

  /** Sync CompanyIntelligence traits (RFM, CLV, churn) */
  @Post('sync/intelligence')
  async syncIntelligence(@CurrentUser('merchantId') merchantId: string) {
    const result = await this.dittofeedService.syncCompanyIntelligence(merchantId);
    return { success: true, ...result };
  }

  /** Sync recent order events */
  @Post('sync/orders')
  async syncOrders(
    @CurrentUser('merchantId') merchantId: string,
    @Query('hours') hours?: string,
  ) {
    const result = await this.dittofeedService.syncOrders(merchantId, Number(hours) || 24);
    return { success: true, ...result };
  }

  /** Sync visitor events */
  @Post('sync/events')
  async syncEvents(
    @CurrentUser('merchantId') merchantId: string,
    @Query('hours') hours?: string,
  ) {
    const result = await this.dittofeedService.syncVisitorEvents(merchantId, Number(hours) || 24);
    return { success: true, ...result };
  }

  /** Sync customer insights (CLV/RFM/Health) — Klaviyo parity */
  @Post('sync/insights')
  async syncInsights(@CurrentUser('merchantId') merchantId: string) {
    const result = await this.dittofeedService.syncCustomerInsights(merchantId);
    return { success: true, ...result };
  }

  /** Sync DTF-specific product traits (favorite product type, transfer type, sqft) */
  @Post('sync/dtf-traits')
  async syncDtfTraits(@CurrentUser('merchantId') merchantId: string) {
    const result = await this.dittofeedService.syncDtfProductTraits(merchantId);
    return { success: true, ...result };
  }

  /** Sync pickup behavior traits */
  @Post('sync/pickup-traits')
  async syncPickupTraits(@CurrentUser('merchantId') merchantId: string) {
    const result = await this.dittofeedService.syncPickupTraits(merchantId);
    return { success: true, ...result };
  }

  /** Full sync: everything — all traits + events */
  @Post('sync/all')
  async syncAll(@CurrentUser('merchantId') merchantId: string) {
    const companies = await this.dittofeedService.syncAllCompanies(merchantId);
    const intelligence = await this.dittofeedService.syncCompanyIntelligence(merchantId);
    const orders = await this.dittofeedService.syncOrders(merchantId, 720); // last 30 days
    const events = await this.dittofeedService.syncVisitorEvents(merchantId, 720);
    const insights = await this.dittofeedService.syncCustomerInsights(merchantId);
    const dtfTraits = await this.dittofeedService.syncDtfProductTraits(merchantId);
    const pickupTraits = await this.dittofeedService.syncPickupTraits(merchantId);

    return {
      success: true,
      companies: companies.synced,
      intelligence: intelligence.synced,
      orders: orders.synced,
      events: events.synced,
      insights: insights.synced,
      dtfTraits: dtfTraits.synced,
      pickupTraits: pickupTraits.synced,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WEBHOOK CALLBACK (Dittofeed Journey → Factory Engine)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Dittofeed journey'lerdeki webhook node'ları bu endpoint'e
   * POST yapar. Journey içinden Factory Engine'e geri bildirim sağlar.
   *
   * Dittofeed Webhook Template'de URL:
   *   POST https://api.yourdomain.com/api/v1/dittofeed/webhook/callback
   *
   * Header: X-Dittofeed-Secret: <shared secret>
   *
   * Body: { type: "pickup_reminder_sent", userId: "...", data: {...} }
   */
  @Public()
  @Post('webhook/callback')
  @HttpCode(200)
  async webhookCallback(
    @Body() body: {
      type: string;
      userId: string;
      journeyName?: string;
      data?: Record<string, any>;
    },
  ) {
    // TODO: Validate X-Dittofeed-Secret header for security
    return this.dittofeedService.handleWebhookCallback(body);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DASHBOARD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Get Dittofeed dashboard URL for iframe embed */
  @Get('dashboard-url')
  getDashboardUrl() {
    const publicUrl = process.env.DITTOFEED_PUBLIC_URL || 'https://marketing.techifyboost.com';
    return { url: publicUrl };
  }

  /** Get sync status overview */
  @Get('sync/status')
  async getSyncStatus(@CurrentUser('merchantId') merchantId: string) {
    const lastSync = await this.getLastSyncTime(merchantId);
    const traitCounts = await this.getTraitSyncCounts(merchantId);

    return {
      success: true,
      lastSyncAt: lastSync,
      counts: traitCounts,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ADMIN API — Segments & Journeys
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Setup all predefined segments in Dittofeed (13 segments) */
  @Post('admin/segments/setup')
  async setupSegments() {
    return this.adminService.setupAllSegments();
  }

  /** List existing segments */
  @Get('admin/segments')
  async listSegments() {
    return this.adminService.listSegments();
  }

  /** List available segment templates */
  @Get('admin/segment-templates')
  getSegmentTemplates() {
    return this.adminService.getAvailableSegmentTemplates();
  }

  /** Create custom segment */
  @Post('admin/segments/custom')
  async createCustomSegment(
    @Body()
    body: {
      name: string;
      conditions: { trait: string; operator: string; value: any }[];
      logic?: 'And' | 'Or';
    },
  ) {
    return this.adminService.createCustomSegment(body.name, body.conditions, body.logic);
  }

  /** List journeys */
  @Get('admin/journeys')
  async listJourneys() {
    return this.adminService.listJourneys();
  }

  /** Admin health check */
  @Get('admin/health')
  async adminHealth() {
    return this.adminService.healthCheck();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CROSS-SELL & RECOMMENDATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Trigger cross-sell analysis for all customers */
  @Post('cross-sell/analyze')
  async analyzeCrossSell(@CurrentUser('merchantId') merchantId: string) {
    return this.crossSellService.analyzeMerchantCrossSell(merchantId);
  }

  /** Trigger supply reorder check */
  @Post('cross-sell/supply-check')
  async checkSupplyReorders(@CurrentUser('merchantId') merchantId: string) {
    return this.crossSellService.checkMerchantSupplyReorders(merchantId);
  }

  /** Get product recommendations for a user */
  @Get('cross-sell/recommendations/:userId')
  async getRecommendations(@Param('userId') userId: string) {
    return this.crossSellService.getRecommendationsForUser(userId);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // JOURNEY & TEMPLATE SETUP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Setup all predefined journeys (7 journeys) */
  @Post('admin/journeys/setup')
  async setupJourneys() {
    return this.adminService.setupAllJourneys();
  }

  /** List available journey templates */
  @Get('admin/journey-templates')
  getJourneyTemplates() {
    return this.adminService.getAvailableJourneyTemplates();
  }

  /** Setup all email templates (7 templates) */
  @Post('admin/templates/setup')
  async setupTemplates() {
    return this.adminService.setupAllEmailTemplates();
  }

  /** List available email templates */
  @Get('admin/email-templates')
  getEmailTemplates() {
    return this.adminService.getAvailableEmailTemplates();
  }

  /** Full store setup — segments + journeys + templates in one call */
  @Post('admin/setup-full')
  async setupFullStore() {
    return this.adminService.setupFullStore();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DITTOFEED DB ANALYTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Full marketing analytics from Dittofeed DB */
  @Get('analytics/full')
  async getFullAnalytics(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.dbReader.getFullAnalytics(Number.isFinite(parsedDays) ? parsedDays : 30);
  }

  /** Campaign metrics (sent, opened, clicked rates) */
  @Get('analytics/campaign')
  async getCampaignMetrics(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.dbReader.getCampaignMetrics(Number.isFinite(parsedDays) ? parsedDays : 30);
  }

  /** Journey completion metrics */
  @Get('analytics/journeys')
  async getJourneyMetrics() {
    return this.dbReader.getJourneyMetrics();
  }

  /** Per-template message performance */
  @Get('analytics/messages')
  async getMessagePerformance(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.dbReader.getMessagePerformance(Number.isFinite(parsedDays) ? parsedDays : 30);
  }

  /** Segment user counts */
  @Get('analytics/segments')
  async getSegmentCounts() {
    return this.dbReader.getSegmentCounts();
  }

  /** Daily email trends */
  @Get('analytics/trends')
  async getDailyTrends(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 14;
    return this.dbReader.getDailyTrends(Number.isFinite(parsedDays) ? parsedDays : 14);
  }

  /** DB health check */
  @Get('analytics/health')
  async dbHealth() {
    return this.dbReader.healthCheck();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIVATE HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private async getLastSyncTime(merchantId: string): Promise<string | null> {
    const lastSync = await this.prisma.marketingSync.findFirst({
      where: { merchantId, syncStatus: 'synced' },
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    });
    return lastSync?.lastSyncedAt?.toISOString() || null;
  }

  private async getTraitSyncCounts(merchantId: string): Promise<Record<string, number>> {

    const [companySyncs, customerSyncs, orderSyncs] = await Promise.all([
      this.prisma.marketingSync.count({
        where: { merchantId, entityType: 'company', syncStatus: 'synced' },
      }),
      this.prisma.marketingSync.count({
        where: { merchantId, entityType: 'user', syncStatus: 'synced' },
      }),
      this.prisma.marketingSync.count({
        where: { merchantId, entityType: 'order', syncStatus: 'synced' },
      }),
    ]);

    return {
      companies: companySyncs,
      customers: customerSyncs,
      orders: orderSyncs,
    };
  }
}
