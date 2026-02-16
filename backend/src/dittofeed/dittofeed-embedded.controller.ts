import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DittofeedAdminService } from './dittofeed-admin.service';
import { DittofeedDbReaderService } from './dittofeed-db-reader.service';
import { DittofeedService } from './dittofeed.service';

/**
 * DittofeedEmbeddedController
 *
 * Admin panele gömülü Dittofeed yönetim bileşenleri.
 * Frontend iframe/widget kullanmadan, doğrudan API üzerinden
 * segment, journey ve template CRUD + analytics sağlar.
 *
 * Frontend'de:
 *   - Segment builder widget
 *   - Journey flowchart editor
 *   - Email template preview
 *   - Real-time campaign analytics dashboard
 *
 * Bu controller, admin panelden Dittofeed'i yönetmek için
 * gerekli tüm endpoint'leri sunar.
 */
@Controller('dittofeed/embedded')
@UseGuards(JwtAuthGuard)
export class DittofeedEmbeddedController {
  constructor(
    private readonly admin: DittofeedAdminService,
    private readonly dbReader: DittofeedDbReaderService,
    private readonly dittofeed: DittofeedService,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SEGMENT MANAGEMENT — Embedded Segment Builder
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Tüm segment'leri listele (Dittofeed API + DB counts) */
  @Get('segments')
  async listSegments() {
    const [segments, counts] = await Promise.all([
      this.admin.listSegments(),
      this.dbReader.getSegmentCounts(),
    ]);

    // Merge segment list with user counts
    const segmentList = Array.isArray(segments) ? segments : [];
    const countMap = new Map(
      (Array.isArray(counts) ? counts : []).map((c: any) => [c.segmentName, c.count]),
    );

    return segmentList.map((seg: any) => ({
      ...seg,
      userCount: countMap.get(seg.name) || 0,
    }));
  }

  /** Kullanılabilir predefined segment template'leri */
  @Get('segments/templates')
  getSegmentTemplates() {
    return this.admin.getAvailableSegmentTemplates();
  }

  /** Tüm predefined segment'leri toplu oluştur */
  @Post('segments/setup-all')
  async setupAllSegments() {
    return this.admin.setupAllSegments();
  }

  /** Custom segment oluştur (drag-drop builder'dan) */
  @Post('segments/custom')
  async createCustomSegment(
    @Body()
    body: {
      name: string;
      conditions: Array<{ trait: string; operator: string; value: any }>;
      logic?: 'And' | 'Or';
    },
  ) {
    return this.admin.createCustomSegment(body.name, body.conditions, body.logic || 'And');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // JOURNEY MANAGEMENT — Embedded Journey Editor
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Tüm journey'leri listele (with performance metrics) */
  @Get('journeys')
  async listJourneys() {
    const [journeys, metrics] = await Promise.all([
      this.admin.listJourneys(),
      this.dbReader.getJourneyMetrics(),
    ]);

    const journeyList = Array.isArray(journeys) ? journeys : [];
    const metricsMap = new Map(
      (Array.isArray(metrics) ? metrics : []).map((m: any) => [m.journeyName, m]),
    );

    return journeyList.map((j: any) => ({
      ...j,
      metrics: metricsMap.get(j.name) || null,
    }));
  }

  /** Kullanılabilir journey template'leri */
  @Get('journeys/templates')
  getJourneyTemplates() {
    return this.admin.getAvailableJourneyTemplates();
  }

  /** Tüm predefined journey'leri toplu oluştur */
  @Post('journeys/setup-all')
  async setupAllJourneys() {
    return this.admin.setupAllJourneys();
  }

  /** Journey status değiştir (start/pause/stop) */
  @Patch('journeys/:journeyId/status')
  async setJourneyStatus(
    @Param('journeyId') journeyId: string,
    @Body('status') status: 'Running' | 'Paused' | 'NotStarted',
  ) {
    return this.admin.setJourneyStatus(journeyId, status);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EMAIL TEMPLATE MANAGEMENT — Embedded Template Editor
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Tüm template'leri listele (with performance) */
  @Get('templates')
  async listTemplates() {
    const [templates, performance] = await Promise.all([
      this.admin.listTemplates(),
      this.dbReader.getMessagePerformance(),
    ]);

    const templateList = Array.isArray(templates) ? templates : [];
    const perfMap = new Map(
      (Array.isArray(performance) ? performance : []).map((p: any) => [p.templateName, p]),
    );

    return templateList.map((t: any) => ({
      ...t,
      performance: perfMap.get(t.name) || null,
    }));
  }

  /** Kullanılabilir email template tanımları (preview) */
  @Get('templates/available')
  getAvailableTemplates() {
    return this.admin.getAvailableEmailTemplates();
  }

  /** Tüm email template'leri toplu oluştur */
  @Post('templates/setup-all')
  async setupAllTemplates() {
    return this.admin.setupAllEmailTemplates();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ONE-CLICK FULL SETUP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Segments + Journeys + Templates hepsini tek çağrıyla oluştur */
  @Post('setup-full')
  async setupFullStore() {
    return this.admin.setupFullStore();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ANALYTICS DASHBOARD — Real-time Campaign Metrics
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Full analytics overview (all metrics combined) */
  @Get('analytics/overview')
  async getAnalyticsOverview(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.dbReader.getFullAnalytics(Number.isFinite(parsedDays) ? parsedDays : 30);
  }

  /** Campaign send/open/click rates */
  @Get('analytics/campaigns')
  async getCampaignStats(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.dbReader.getCampaignMetrics(Number.isFinite(parsedDays) ? parsedDays : 30);
  }

  /** Journey funnel completion rates */
  @Get('analytics/journeys')
  async getJourneyAnalytics() {
    return this.dbReader.getJourneyMetrics();
  }

  /** Per-template message performance */
  @Get('analytics/messages')
  async getMessageStats(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.dbReader.getMessagePerformance(Number.isFinite(parsedDays) ? parsedDays : 30);
  }

  /** Daily email trends for charts */
  @Get('analytics/daily-trends')
  async getDailyTrends(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 14;
    return this.dbReader.getDailyTrends(Number.isFinite(parsedDays) ? parsedDays : 14);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WIDGET CONFIGURATION — Frontend component data
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Widget configuration — frontend'in hangi bileşenleri
   * göstereceğini belirler
   */
  @Get('widget-config')
  getWidgetConfig() {
    return {
      version: '1.0',
      widgets: [
        {
          id: 'segment-builder',
          name: 'Segment Builder',
          description: 'DTF sektörüne özel müşteri segmentleri oluşturun',
          endpoint: 'dittofeed/embedded/segments',
          type: 'crud',
          features: ['list', 'create', 'templates', 'bulk-setup'],
          availableTraits: [
            'predicted_clv', 'churn_risk_level', 'days_since_last_order',
            'total_orders', 'favorite_product_type', 'preferred_transfer_type',
            'gang_sheet_fill_rate', 'avg_order_interval_days', 'lifetime_sqft',
            'last_product_type', 'total_spent', 'customer_tier',
          ],
          availableOperators: ['Equals', 'NotEquals', 'GreaterThanOrEqual', 'LessThan', 'Exists', 'NotExists'],
        },
        {
          id: 'journey-manager',
          name: 'Journey Manager',
          description: 'Otomatik pazarlama akışlarını yönetin',
          endpoint: 'dittofeed/embedded/journeys',
          type: 'crud',
          features: ['list', 'templates', 'bulk-setup', 'start-pause'],
        },
        {
          id: 'template-editor',
          name: 'Email Template Editor',
          description: 'Sektöre özel email şablonlarını yönetin',
          endpoint: 'dittofeed/embedded/templates',
          type: 'crud',
          features: ['list', 'preview', 'bulk-setup'],
        },
        {
          id: 'analytics-dashboard',
          name: 'Marketing Analytics',
          description: 'Kampanya performansını gerçek zamanlı izleyin',
          endpoint: 'dittofeed/embedded/analytics',
          type: 'dashboard',
          features: ['overview', 'campaigns', 'journeys', 'messages', 'daily-trends'],
          chartTypes: ['bar', 'line', 'funnel', 'pie'],
        },
      ],
      quickActions: [
        {
          label: 'Full Store Setup',
          description: 'Segments + Journeys + Templates hepsini tek tıkla oluştur',
          endpoint: 'dittofeed/embedded/setup-full',
          method: 'POST',
          confirmRequired: true,
        },
      ],
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // IFRAME / EMBED URLS — Doğrudan Dittofeed UI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Dittofeed UI embed URL'leri — admin panelde iframe ile gömülecek.
   * Not: Bu özelllik Dittofeed'in iframe desteğine bağlıdır.
   * API-first yaklaşım tercih edilir.
   */
  @Get('embed-urls')
  getEmbedUrls() {
    const dittofeedUrl = process.env.DITTOFEED_DASHBOARD_URL || 'http://localhost:3010';

    return {
      note: 'These URLs can be embedded as iframes if Dittofeed supports it. Prefer using the API-based widget endpoints instead.',
      dashboardUrl: dittofeedUrl,
      segments: `${dittofeedUrl}/segments`,
      journeys: `${dittofeedUrl}/journeys`,
      templates: `${dittofeedUrl}/templates`,
      broadcasts: `${dittofeedUrl}/broadcasts`,
      settings: `${dittofeedUrl}/settings`,
      apiAlternative: {
        message: 'For full embedded experience without iframes, use the dittofeed/embedded/* endpoints (global prefix api/v1 is added automatically)',
        widgetConfig: 'dittofeed/embedded/widget-config',
      },
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HEALTH & STATUS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Dittofeed Admin API + DB connection health */
  @Get('health')
  async getHealth() {
    const [adminHealth, dbHealth] = await Promise.all([
      this.admin.healthCheck(),
      this.dbReader.healthCheck(),
    ]);

    return {
      adminApi: adminHealth,
      database: dbHealth,
      overall: adminHealth.connected && (dbHealth as any).connected,
    };
  }
}
