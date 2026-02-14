import { NotificationsService, NotificationPreferences } from './notifications.service';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getNotifications(userId: string, companyId: string, type?: string, isRead?: string, limit?: string, offset?: string): Promise<{
        notifications: import("./notifications.service").Notification[];
        total: number;
    }>;
    getUnreadCount(userId: string, companyId: string): Promise<{
        count: number;
    }>;
    getPreferences(userId: string): Promise<NotificationPreferences>;
    updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
    markAsRead(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    markMultipleAsRead(body: {
        ids: string[];
    }, userId: string): Promise<{
        success: boolean;
        count: number;
    }>;
    markAllAsRead(userId: string, companyId: string): Promise<{
        success: boolean;
        count: number;
    }>;
    deleteNotification(id: string, userId: string): Promise<{
        success: boolean;
    }>;
}
