import { 
  Controller, 
  Get, 
  Put, 
  Post,
  Delete,
  Param, 
  Query,
  Body,
  UseGuards, 
  BadRequestException 
} from '@nestjs/common';
import { NotificationsService, NotificationFilters, NotificationPreferences } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * Get all notifications with optional filters
   */
  @Get()
  async getNotifications(
    @CurrentUser('sub') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('type') type?: string,
    @Query('isRead') isRead?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!userId || !companyId) {
      throw new BadRequestException('User ID and Company ID required');
    }

    const filters: NotificationFilters = {};
    if (type) filters.type = type as NotificationFilters['type'];
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    return this.notificationsService.getNotifications(userId, companyId, filters);
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('sub') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!userId || !companyId) {
      throw new BadRequestException('User ID and Company ID required');
    }
    const count = await this.notificationsService.getUnreadCount(userId, companyId);
    return { count };
  }

  /**
   * Get notification preferences
   */
  @Get('preferences')
  async getPreferences(
    @CurrentUser('sub') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.notificationsService.getPreferences(userId);
  }

  /**
   * Update notification preferences
   */
  @Put('preferences')
  async updatePreferences(
    @CurrentUser('sub') userId: string,
    @Body() preferences: Partial<NotificationPreferences>,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.notificationsService.updatePreferences(userId, preferences);
  }

  /**
   * Mark a single notification as read
   */
  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.notificationsService.markAsRead(id, userId);
  }

  /**
   * Mark multiple notifications as read
   */
  @Post('mark-read')
  async markMultipleAsRead(
    @Body() body: { ids: string[] },
    @CurrentUser('sub') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    if (!body.ids || !Array.isArray(body.ids)) {
      throw new BadRequestException('IDs array required');
    }
    return this.notificationsService.markMultipleAsRead(body.ids, userId);
  }

  /**
   * Mark all notifications as read
   */
  @Put('read-all')
  async markAllAsRead(
    @CurrentUser('sub') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!userId || !companyId) {
      throw new BadRequestException('User ID and Company ID required');
    }
    return this.notificationsService.markAllAsRead(userId, companyId);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.notificationsService.deleteNotification(id, userId);
  }
}

