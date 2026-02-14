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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const settings_service_1 = require("./settings.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const settings_dto_1 = require("./dto/settings.dto");
let SettingsController = class SettingsController {
    settingsService;
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    async getMerchantSettings(merchantId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.settingsService.getMerchantSettings(merchantId);
    }
    async updateMerchantSettings(merchantId, dto) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.settingsService.updateMerchantSettings(merchantId, dto);
    }
    async toggleSnippet(merchantId, dto) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.settingsService.toggleSnippet(merchantId, dto.enabled);
    }
    async getCompanySettings(companyId) {
        if (!companyId) {
            throw new common_1.BadRequestException('Company ID required');
        }
        return this.settingsService.getCompanySettings(companyId);
    }
    async updateCompanySettings(companyId, dto) {
        if (!companyId) {
            throw new common_1.BadRequestException('Company ID required');
        }
        return this.settingsService.updateCompanySettings(companyId, dto);
    }
    async getSsoSettings(merchantId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.settingsService.getSsoSettings(merchantId);
    }
    async updateSsoSettings(merchantId, dto) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.settingsService.updateSsoSettings(merchantId, dto);
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)('merchant'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getMerchantSettings", null);
__decorate([
    (0, common_1.Put)('merchant'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, settings_dto_1.UpdateMerchantSettingsDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateMerchantSettings", null);
__decorate([
    (0, common_1.Put)('snippet/toggle'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, settings_dto_1.ToggleSnippetDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "toggleSnippet", null);
__decorate([
    (0, common_1.Get)('company'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getCompanySettings", null);
__decorate([
    (0, common_1.Put)('company'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, settings_dto_1.UpdateCompanySettingsDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateCompanySettings", null);
__decorate([
    (0, common_1.Get)('sso'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getSsoSettings", null);
__decorate([
    (0, common_1.Put)('sso'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, settings_dto_1.UpdateSsoSettingsDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateSsoSettings", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.Controller)('settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map