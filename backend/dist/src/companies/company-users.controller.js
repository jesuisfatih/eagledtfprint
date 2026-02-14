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
exports.CompanyUsersController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const company_users_service_1 = require("./company-users.service");
let CompanyUsersController = class CompanyUsersController {
    companyUsersService;
    constructor(companyUsersService) {
        this.companyUsersService = companyUsersService;
    }
    async getMyProfile(userId) {
        const user = await this.companyUsersService.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateMyProfile(userId, body) {
        const updateData = {};
        if (body.firstName !== undefined)
            updateData.firstName = body.firstName;
        if (body.lastName !== undefined)
            updateData.lastName = body.lastName;
        if (body.phone !== undefined)
            updateData.phone = body.phone;
        return this.companyUsersService.update(userId, updateData);
    }
    async changePassword(userId, body) {
        if (!body.currentPassword || !body.newPassword) {
            throw new common_1.BadRequestException('Current password and new password are required');
        }
        if (body.newPassword.length < 8) {
            throw new common_1.BadRequestException('New password must be at least 8 characters');
        }
        return this.companyUsersService.changePassword(userId, body.currentPassword, body.newPassword);
    }
    async getNotificationPreferences(userId) {
        return this.companyUsersService.getNotificationPreferences(userId);
    }
    async updateNotificationPreferences(userId, preferences) {
        return this.companyUsersService.updateNotificationPreferences(userId, preferences);
    }
    async updateUserRole(userId, body) {
        if (!body.role) {
            throw new common_1.BadRequestException('Role is required');
        }
        return this.companyUsersService.update(userId, { role: body.role });
    }
    async updateUserStatus(userId, body) {
        if (body.isActive === undefined) {
            throw new common_1.BadRequestException('isActive is required');
        }
        return this.companyUsersService.update(userId, { isActive: body.isActive });
    }
};
exports.CompanyUsersController = CompanyUsersController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyUsersController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Put)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompanyUsersController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Put)('me/password'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompanyUsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Get)('me/notifications'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyUsersController.prototype, "getNotificationPreferences", null);
__decorate([
    (0, common_1.Put)('me/notifications'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompanyUsersController.prototype, "updateNotificationPreferences", null);
__decorate([
    (0, common_1.Put)(':id/role'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompanyUsersController.prototype, "updateUserRole", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompanyUsersController.prototype, "updateUserStatus", null);
exports.CompanyUsersController = CompanyUsersController = __decorate([
    (0, common_1.Controller)('company-users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [company_users_service_1.CompanyUsersService])
], CompanyUsersController);
//# sourceMappingURL=company-users.controller.js.map