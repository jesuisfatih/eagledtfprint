"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    prisma;
    logger = new common_1.Logger(NotificationsService_1.name);
    readNotifications = new Map();
    userPreferences = new Map();
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getNotifications(userId, companyId, filters) {
        const limit = filters?.limit ?? 50;
        const offset = filters?.offset ?? 0;
        const where = {
            OR: [{ companyId }, { companyUserId: userId }],
        };
        if (filters?.fromDate || filters?.toDate) {
            where.createdAt = {};
            if (filters.fromDate) {
                where.createdAt.gte = filters.fromDate;
            }
            if (filters.toDate) {
                where.createdAt.lte = filters.toDate;
            }
        }
        const total = await this.prisma.activityLog.count({ where });
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
            message: this.generateMessage(activity.eventType, activity.payload),
            isRead: userReadSet.has(activity.id),
            priority: this.getPriority(activity.eventType),
            data: activity.payload,
            createdAt: activity.createdAt,
        }))
            .filter((n) => {
            if (filters?.type && n.type !== filters.type)
                return false;
            if (filters?.isRead !== undefined && n.isRead !== filters.isRead)
                return false;
            return true;
        });
        return { notifications, total };
    }
    async markAsRead(id, userId) {
        let userReadSet = this.readNotifications.get(userId);
        if (!userReadSet) {
            userReadSet = new Set();
            this.readNotifications.set(userId, userReadSet);
        }
        userReadSet.add(id);
        this.logger.log(`Notification ${id} marked as read for user ${userId}`);
        return { success: true };
    }
    async markMultipleAsRead(ids, userId) {
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
    async markAllAsRead(userId, companyId) {
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
    async getUnreadCount(userId, companyId) {
        const { notifications } = await this.getNotifications(userId, companyId);
        return notifications.filter((n) => !n.isRead).length;
    }
    async getPreferences(userId) {
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
    async updatePreferences(userId, preferences) {
        const currentPrefs = await this.getPreferences(userId);
        const updatedPrefs = { ...currentPrefs, ...preferences };
        this.userPreferences.set(userId, updatedPrefs);
        this.logger.log(`Notification preferences updated for user ${userId}`);
        return updatedPrefs;
    }
    async deleteNotification(id, userId) {
        const userReadSet = this.readNotifications.get(userId);
        if (userReadSet) {
            userReadSet.delete(id);
        }
        return { success: true };
    }
    mapEventTypeToNotificationType(eventType) {
        if (eventType.includes('order'))
            return 'order';
        if (eventType.includes('quote'))
            return 'quote';
        if (eventType.includes('approval'))
            return 'approval';
        if (eventType.includes('sync'))
            return 'sync';
        if (eventType.includes('cart'))
            return 'cart';
        return 'system';
    }
    generateTitle(eventType) {
        const titles = {
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
    generateMessage(eventType, payload) {
        const messages = {
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
    getPriority(eventType) {
        const highPriority = ['order_cancelled', 'sync_failed', 'approval_required'];
        const urgentPriority = ['payment_failed', 'security_alert'];
        if (urgentPriority.includes(eventType))
            return 'urgent';
        if (highPriority.includes(eventType))
            return 'high';
        return 'normal';
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map