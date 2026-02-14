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
export declare class NotificationsService {
    private prisma;
    private readonly logger;
    private readNotifications;
    private userPreferences;
    constructor(prisma: PrismaService);
    getNotifications(userId: string, companyId: string, filters?: NotificationFilters): Promise<{
        notifications: Notification[];
        total: number;
    }>;
    markAsRead(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    markMultipleAsRead(ids: string[], userId: string): Promise<{
        success: boolean;
        count: number;
    }>;
    markAllAsRead(userId: string, companyId: string): Promise<{
        success: boolean;
        count: number;
    }>;
    getUnreadCount(userId: string, companyId: string): Promise<number>;
    getPreferences(userId: string): Promise<NotificationPreferences>;
    updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
    deleteNotification(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    private mapEventTypeToNotificationType;
    private generateTitle;
    private generateMessage;
    private getPriority;
}
