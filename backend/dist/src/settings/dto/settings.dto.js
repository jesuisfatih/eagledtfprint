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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleSnippetDto = exports.UpdateSsoSettingsDto = exports.UpdateCompanySettingsDto = exports.UpdateMerchantSettingsDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateMerchantSettingsDto {
    shopDomain;
    storeName;
    currency;
    timezone;
    supportEmail;
    logoUrl;
    snippetEnabled;
}
exports.UpdateMerchantSettingsDto = UpdateMerchantSettingsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMerchantSettingsDto.prototype, "shopDomain", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMerchantSettingsDto.prototype, "storeName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMerchantSettingsDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMerchantSettingsDto.prototype, "timezone", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMerchantSettingsDto.prototype, "supportEmail", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMerchantSettingsDto.prototype, "logoUrl", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateMerchantSettingsDto.prototype, "snippetEnabled", void 0);
class UpdateCompanySettingsDto {
    notificationsEnabled;
    quoteNotifications;
    orderNotifications;
    netTermsDays;
    preferredPaymentMethod;
}
exports.UpdateCompanySettingsDto = UpdateCompanySettingsDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateCompanySettingsDto.prototype, "notificationsEnabled", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateCompanySettingsDto.prototype, "quoteNotifications", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateCompanySettingsDto.prototype, "orderNotifications", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], UpdateCompanySettingsDto.prototype, "netTermsDays", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "preferredPaymentMethod", void 0);
class UpdateSsoSettingsDto {
    mode;
    multipassSecret;
    storefrontToken;
}
exports.UpdateSsoSettingsDto = UpdateSsoSettingsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSsoSettingsDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSsoSettingsDto.prototype, "multipassSecret", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSsoSettingsDto.prototype, "storefrontToken", void 0);
class ToggleSnippetDto {
    enabled;
}
exports.ToggleSnippetDto = ToggleSnippetDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ToggleSnippetDto.prototype, "enabled", void 0);
//# sourceMappingURL=settings.dto.js.map