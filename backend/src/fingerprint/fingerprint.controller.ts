import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CollectFingerprintDto } from './dto/collect-fingerprint.dto';
import { FingerprintService } from './fingerprint.service';

@Controller('fingerprint')
export class FingerprintController {
  constructor(
    private readonly fingerprintService: FingerprintService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Public endpoint — called by the storefront snippet
   */
  @Post('collect')
  @Public()
  @Throttle({ short: { limit: 30, ttl: 1000 }, medium: { limit: 100, ttl: 10000 } })
  async collect(@Body() dto: CollectFingerprintDto, @Req() req: any) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    return this.fingerprintService.collectFingerprint(dto, ip);
  }

  /**
   * Track event — called by snippet (public, no auth)
   * Uses @Req() to bypass global ValidationPipe (forbidNonWhitelisted strips unknown fields)
   */
  @Post('event')
  @Public()
  @Throttle({ short: { limit: 50, ttl: 1000 }, medium: { limit: 200, ttl: 10000 } })
  async trackEvent(@Req() req: any) {
    const body = req.body;
    if (!body.shop || !body.sessionId || !body.eventType) {
      return { success: false, error: 'Missing required fields' };
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { shopDomain: body.shop },
    });
    if (!merchant) return { success: false, error: 'Unknown shop' };

    await this.fingerprintService.trackEvent(
      merchant.id,
      body.sessionId,
      body.payload?.fingerprintHash || body.fingerprintHash || '',
      body.eventType,
      body.payload || {},
    );

    return { success: true };
  }

  /**
   * Heartbeat — real-time presence tracking from snippet
   * Uses @Req() to bypass global ValidationPipe
   */
  @Post('heartbeat')
  @Public()
  @SkipThrottle()
  async heartbeat(@Req() req: any) {
    const body = req.body;
    if (!body.shop || !body.sessionId) {
      return { success: false };
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { shopDomain: body.shop },
    });
    if (!merchant) return { success: false };

    await this.fingerprintService.processHeartbeat(merchant.id, {
      sessionId: body.sessionId,
      fingerprintHash: body.fingerprintHash,
      eagleToken: body.eagleToken,
      status: body.status || 'online',
      timestamp: body.timestamp,
      page: body.page,
      viewport: body.viewport,
    });

    return { success: true };
  }

  /**
   * Session recording data — rrweb events for Clarity-grade replay
   * Uses @Req() to bypass global ValidationPipe (rrweb events have deeply nested dynamic structure)
   */
  @Post('mouse')
  @Public()
  @SkipThrottle()
  async mouseTracking(@Req() req: any) {
    const body = req.body;

    if (!body.shop || !body.sessionId || !body.events?.length) {
      return { success: false };
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { shopDomain: body.shop },
    });
    if (!merchant) return { success: false };

    await this.fingerprintService.processMouseData(merchant.id, {
      sessionId: body.sessionId,
      fingerprintHash: body.fingerprintHash,
      viewport: body.viewport,
      pageUrl: body.pageUrl,
      events: body.events,
    });

    return { success: true };
  }

  /**
   * Traffic attribution — multi-touch attribution data from snippet
   * Captures UTM, gclid, fbclid, referrer, channel for each session touch
   */
  @Post('attribution')
  @Public()
  @Throttle({ short: { limit: 30, ttl: 1000 }, medium: { limit: 100, ttl: 10000 } })
  async trackAttribution(@Req() req: any) {
    const body = req.body;
    if (!body.shop || !body.sessionId) {
      return { success: false, error: 'Missing required fields' };
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { shopDomain: body.shop },
    });
    if (!merchant) return { success: false, error: 'Unknown shop' };

    await this.fingerprintService.processAttribution(merchant.id, body);
    return { success: true };
  }

  // ─── Admin Endpoints ───

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboard(@CurrentUser('merchantId') merchantId: string) {
    return this.fingerprintService.getDashboard(merchantId);
  }

  @Get('hot-leads')
  @UseGuards(JwtAuthGuard)
  async getHotLeads(@CurrentUser('merchantId') merchantId: string) {
    return this.fingerprintService.getHotLeads(merchantId);
  }

  @Get('company-intelligence')
  @UseGuards(JwtAuthGuard)
  async getCompanyIntelligence(
    @CurrentUser('merchantId') merchantId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.fingerprintService.getCompanyIntelligence(merchantId, companyId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessionHistory(
    @CurrentUser('merchantId') merchantId: string,
    @Query('companyId') companyId?: string,
    @Query('companyUserId') companyUserId?: string,
    @Query('fingerprintId') fingerprintId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fingerprintService.getSessionHistory(merchantId, {
      companyId,
      companyUserId,
      fingerprintId,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Get currently active visitors (real-time)
   */
  @Get('active-visitors')
  @UseGuards(JwtAuthGuard)
  async getActiveVisitors(@CurrentUser('merchantId') merchantId: string) {
    return this.fingerprintService.getActiveVisitors(merchantId);
  }

  /**
   * Get session replay data for rrweb-player
   */
  @Get('replay')
  @UseGuards(JwtAuthGuard)
  async getSessionReplay(
    @CurrentUser('merchantId') merchantId: string,
    @Query('sessionId') sessionId: string,
  ) {
    return this.fingerprintService.getSessionReplay(merchantId, sessionId);
  }

  /**
   * Traffic analytics — GA4-level traffic source analytics for admin panel
   */
  @Get('traffic-analytics')
  @UseGuards(JwtAuthGuard)
  async getTrafficAnalytics(
    @CurrentUser('merchantId') merchantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('channel') channel?: string,
    @Query('utmSource') utmSource?: string,
    @Query('utmCampaign') utmCampaign?: string,
  ) {
    return this.fingerprintService.getTrafficAnalytics(merchantId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      channel,
      utmSource,
      utmCampaign,
    });
  }
}
