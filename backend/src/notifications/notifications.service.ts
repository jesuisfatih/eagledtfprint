import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Notification {
  id: string;
  type: 'order' | 'quote' | 'approval' | 'system' | 'sync' | 'cart';
  title: string;
  message: string;
  isRead: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, unknown>;
  createdAt: Date;
}

export interface NotificationFilters {
  type?: Notification['type'];
  isRead?: boolean;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  orderUpdates: boolean;
  quoteUpdates: boolean;
  systemAlerts: boolean;
  marketingEmails: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  
  // In-memory read status tracking (in production, use DB)
  private readNotifications: Map<string, Set<string>> = new Map();
  // In-memory notification preferences (in production, use DB)
  private userPreferences: Map<string, NotificationPreferences> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * Get notifications for a user with filtering
   */
  async getNotifications(
    userId: string, 
    companyId: string, 
    filters?: NotificationFilters
  ): Promise<{ notifications: Notification[]; total: number }> {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    // Build where clause
    const where: Record<string, unknown> = {
      OR: [{ companyId }, { companyUserId: userId }],
    };

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        (where.createdAt as Record<string, Date>).gte = filters.fromDate;
      }
      if (filters.toDate) {
        (where.createdAt as Record<string, Date>).lte = filters.toDate;
      }
    }

    // Get total count
    const total = await this.prisma.activityLog.count({ where });

    // Activity log'dan notification'lar oluştur
    const recentActivity = await this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const userReadSet = this.readNotifications.get(userId) || new Set();

    const notifications = recentActivity
      .map((activity) => ({
        id: activity.id,
        type: this.mapEventTypeToNotificationType(activity.eventType),
        title: this.generateTitle(activity.eventType),
        message: this.generateMessage(activity.eventType, activity.payload as Record<string, unknown>),
        isRead: userReadSet.has(activity.id),
        priority: this.getPriority(activity.eventType),
        data: activity.payload as Record<string, unknown>,
        createdAt: activity.createdAt,
      }))
      .filter((n) => {
        // Apply filters
        if (filters?.type && n.type !== filters.type) return false;
        if (filters?.isRead !== undefined && n.isRead !== filters.isRead) return false;
        return true;
      });

    return { notifications, total };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string): Promise<{ success: boolean }> {
    let userReadSet = this.readNotifications.get(userId);
    if (!userReadSet) {
      userReadSet = new Set();
      this.readNotifications.set(userId, userReadSet);
    }
    userReadSet.add(id);
    
    this.logger.log(`Notification ${id} marked as read for user ${userId}`);
    return { success: true };
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[], userId: string): Promise<{ success: boolean; count: number }> {
    let userReadSet = this.readNotifications.get(userId);
    if (!userReadSet) {
      userReadSet = new Set();
      this.readNotifications.set(userId, userReadSet);
    }
    
    let count = 0;
    for (const id of ids) {
      if (!userReadSet.has(id)) {
        userReadSet.add(id);
        count++;
      }
    }
    
    return { success: true, count };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, companyId: string): Promise<{ success: boolean; count: number }> {
    const { notifications } = await this.getNotifications(userId, companyId);
    
    let userReadSet = this.readNotifications.get(userId);
    if (!userReadSet) {
      userReadSet = new Set();
      this.readNotifications.set(userId, userReadSet);
    }

    let count = 0;
    for (const notification of notifications) {
      if (!userReadSet.has(notification.id)) {
        userReadSet.add(notification.id);
        count++;
      }
    }
    
    this.logger.log(`${count} notifications marked as read for user ${userId}`);
    return { success: true, count };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, companyId: string): Promise<number> {
    const { notifications } = await this.getNotifications(userId, companyId);
    return notifications.filter((n) => !n.isRead).length;
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const prefs = this.userPreferences.get(userId);
    return prefs || {
      email: true,
      push: true,
      orderUpdates: true,
      quoteUpdates: true,
      systemAlerts: true,
      marketingEmails: false,
    };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const currentPrefs = await this.getPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences };
    this.userPreferences.set(userId, updatedPrefs);
    
    this.logger.log(`Notification preferences updated for user ${userId}`);
    return updatedPrefs;
  }

  /**
   * Delete a notification (remove from read list if present)
   */
  async deleteNotification(id: string, userId: string): Promise<{ success: boolean }> {
    const userReadSet = this.readNotifications.get(userId);
    if (userReadSet) {
      userReadSet.delete(id);
    }
    return { success: true };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapEventTypeToNotificationType(eventType: string): Notification['type'] {
    if (eventType.includes('order')) return 'order';
    if (eventType.includes('quote')) return 'quote';
    if (eventType.includes('approval')) return 'approval';
    if (eventType.includes('sync')) return 'sync';
    if (eventType.includes('cart')) return 'cart';
    return 'system';
  }

  private generateTitle(eventType: string): string {
    const titles: Record<string, string> = {
      product_view: 'Product Viewed',
      add_to_cart: 'Item Added to Cart',
      remove_from_cart: 'Item Removed from Cart',
      checkout_start: 'Checkout Started',
      checkout_complete: 'Order Placed',
      order_created: 'New Order',
      order_confirmed: 'Order Confirmed',
      order_shipped: 'Order Shipped',
      order_delivered: 'Order Delivered',
      order_cancelled: 'Order Cancelled',
      quote_requested: 'Quote Requested',
      quote_approved: 'Quote Approved',
      quote_rejected: 'Quote Rejected',
      approval_required: 'Approval Required',
      approval_granted: 'Approval Granted',
      sync_started: 'Sync Started',
      sync_completed: 'Sync Completed',
      sync_failed: 'Sync Failed',
      login: 'Login Activity',
      password_changed: 'Password Changed',
    };
    return titles[eventType] || 'Activity';
  }

  private generateMessage(eventType: string, payload?: Record<string, unknown>): string {
    const messages: Record<string, string> = {
      product_view: `Viewed product: ${payload?.productTitle || 'Unknown'}`,
      add_to_cart: `Added ${payload?.quantity || 1} item(s) to cart`,
      checkout_start: 'Checkout process started',
      order_created: `Order #${payload?.orderId || ''} has been created`,
      order_shipped: `Order #${payload?.orderId || ''} has been shipped`,
      quote_requested: 'A new quote has been requested',
      quote_approved: `Quote #${payload?.quoteId || ''} has been approved`,
      approval_required: `Cart requires approval: $${payload?.total || 0}`,
      sync_completed: `${payload?.type || 'Data'} sync completed successfully`,
    };
    return messages[eventType] || `Event: ${eventType}`;
  }

  private getPriority(eventType: string): Notification['priority'] {
    const highPriority = ['order_cancelled', 'sync_failed', 'approval_required'];
    const urgentPriority = ['payment_failed', 'security_alert'];
    
    if (urgentPriority.includes(eventType)) return 'urgent';
    if (highPriority.includes(eventType)) return 'high';
    return 'normal';
  }
}

