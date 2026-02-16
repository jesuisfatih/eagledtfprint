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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const notifications_service_1 = require("./notifications.service");
let NotificationsController = class NotificationsController {
    notificationsService;
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    async getNotifications(userId, companyId, type, isRead, limit, offset) {
        if (!userId || !companyId) {
            throw new common_1.BadRequestException('User ID and Company ID required');
        }
        const filters = {};
        if (type)
            filters.type = type;
        if (isRead !== undefined)
            filters.isRead = isRead === 'true';
        if (limit) {
            const n = parseInt(limit, 10);
            filters.limit = Number.isFinite(n) ? n : undefined;
        }
        if (offset) {
            const n = parseInt(offset, 10);
            filters.offset = Number.isFinite(n) ? n : undefined;
        }
        return this.notificationsService.getNotifications(userId, companyId, filters);
    }
    async getUnreadCount(userId, companyId) {
        if (!userId || !companyId) {
            throw new common_1.BadRequestException('User ID and Company ID required');
        }
        const count = await this.notificationsService.getUnreadCount(userId, companyId);
        return { count };
    }
    async getPreferences(userId) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID required');
        }
        return this.notificationsService.getPreferences(userId);
    }
    async updatePreferences(userId, preferences) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID required');
        }
        return this.notificationsService.updatePreferences(userId, preferences);
    }
    async markAsRead(id, userId) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID required');
        }
        return this.notificationsService.markAsRead(id, userId);
    }
    async markMultipleAsRead(body, userId) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID required');
        }
        if (!body.ids || !Array.isArray(body.ids)) {
            throw new common_1.BadRequestException('IDs array required');
        }
        return this.notificationsService.markMultipleAsRead(body.ids, userId);
    }
    async markAllAsRead(userId, companyId) {
        if (!userId || !companyId) {
            throw new common_1.BadRequestException('User ID and Company ID required');
        }
        return this.notificationsService.markAllAsRead(userId, companyId);
    }
    async deleteNotification(id, userId) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID required');
        }
        return this.notificationsService.deleteNotification(id, userId);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('isRead')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)('preferences'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Put)('preferences'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Put)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Post)('mark-read'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markMultipleAsRead", null);
__decorate([
    (0, common_1.Put)('read-all'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "deleteNotification", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map