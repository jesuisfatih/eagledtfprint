import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsQueryDto, CollectEventDto, GetEventsQueryDto } from './dto/event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  // Public endpoint - STRICT RATE LIMITING + DTO VALIDATION to prevent abuse
  @Public()
  @Throttle({ short: { limit: 50, ttl: 1000 }, medium: { limit: 200, ttl: 10000 } })
  @Post('collect')
  async collectEvent(@Body() dto: CollectEventDto) {
    return this.eventsService.collectEvent(dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('company')
  async getCompanyEvents(
    @CurrentUser('companyId') companyId: string,
    @Query() query: GetEventsQueryDto,
  ) {
    return this.eventsService.getEventsByCompany(companyId, {
      eventType: query.eventType,
      limit: query.limit,
    });
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('analytics')
  async getAnalytics(
    @CurrentUser('merchantId') merchantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const dateRange = query.from && query.to ? {
      from: new Date(query.from),
      to: new Date(query.to),
    } : undefined;

    return this.eventsService.getAnalytics(merchantId, dateRange);
  }

  /**
   * Admin activity feed - returns recent activity logs
   */
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('admin-activity')
  async getAdminActivity(
    @CurrentUser('merchantId') merchantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.getAdminActivityFeed(merchantId, limit ? parseInt(limit) : 50);
  }

  /**
   * Webhook activity feed - returns webhook-related events for the webhooks page
   */
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('webhook-activity')
  async getWebhookActivity(
    @CurrentUser('merchantId') merchantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.getWebhookActivityFeed(merchantId, limit ? parseInt(limit) : 100);
  }

  /**
   * Session activity feed - returns login/logout events for the sessions page
   */
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('session-activity')
  async getSessionActivity(
    @CurrentUser('merchantId') merchantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.getSessionActivityFeed(merchantId, limit ? parseInt(limit) : 50);
  }
}
