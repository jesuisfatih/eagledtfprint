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
exports.GetRulesQueryDto = exports.ToggleRuleDto = exports.UpdatePricingRuleDto = exports.CreatePricingRuleDto = exports.CalculatePricesDto = exports.ScopeType = exports.TargetType = exports.DiscountType = void 0;
const class_validator_1 = require("class-validator");
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED_AMOUNT"] = "fixed_amount";
    DiscountType["FIXED_PRICE"] = "fixed_price";
    DiscountType["QTY_BREAKS"] = "qty_breaks";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
var TargetType;
(function (TargetType) {
    TargetType["ALL"] = "all";
    TargetType["COMPANY"] = "company";
    TargetType["COMPANY_USER"] = "company_user";
    TargetType["COMPANY_GROUP"] = "company_group";
    TargetType["SEGMENT"] = "segment";
    TargetType["BUYER_INTENT"] = "buyer_intent";
})(TargetType || (exports.TargetType = TargetType = {}));
var ScopeType;
(function (ScopeType) {
    ScopeType["ALL"] = "all";
    ScopeType["PRODUCTS"] = "products";
    ScopeType["COLLECTIONS"] = "collections";
    ScopeType["TAGS"] = "tags";
    ScopeType["VARIANTS"] = "variants";
})(ScopeType || (exports.ScopeType = ScopeType = {}));
class CalculatePricesDto {
    variantIds;
    quantities;
    cartTotal;
}
exports.CalculatePricesDto = CalculatePricesDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CalculatePricesDto.prototype, "variantIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CalculatePricesDto.prototype, "quantities", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculatePricesDto.prototype, "cartTotal", void 0);
class CreatePricingRuleDto {
    name;
    description;
    targetType;
    targetCompanyId;
    targetCompanyUserId;
    targetCompanyGroup;
    scopeType;
    scopeProductIds;
    scopeCollectionIds;
    scopeTags;
    scopeVariantIds;
    discountType;
    discountValue;
    discountPercentage;
    qtyBreaks;
    minCartAmount;
    priority;
    isActive;
    validFrom;
    validUntil;
}
exports.CreatePricingRuleDto = CreatePricingRuleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(TargetType),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "targetType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "targetCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "targetCompanyUserId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "targetCompanyGroup", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ScopeType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "scopeType", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreatePricingRuleDto.prototype, "scopeProductIds", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreatePricingRuleDto.prototype, "scopeCollectionIds", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "scopeTags", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreatePricingRuleDto.prototype, "scopeVariantIds", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DiscountType),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "discountType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePricingRuleDto.prototype, "discountValue", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreatePricingRuleDto.prototype, "discountPercentage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreatePricingRuleDto.prototype, "qtyBreaks", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePricingRuleDto.prototype, "minCartAmount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePricingRuleDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreatePricingRuleDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "validFrom", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "validUntil", void 0);
class UpdatePricingRuleDto {
    name;
    description;
    targetType;
    targetCompanyId;
    targetCompanyUserId;
    targetCompanyGroup;
    scopeType;
    scopeProductIds;
    scopeCollectionIds;
    scopeTags;
    scopeVariantIds;
    discountType;
    discountValue;
    discountPercentage;
    qtyBreaks;
    minCartAmount;
    priority;
    isActive;
    validFrom;
    validUntil;
}
exports.UpdatePricingRuleDto = UpdatePricingRuleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(TargetType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "targetType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "targetCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "targetCompanyUserId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "targetCompanyGroup", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ScopeType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "scopeType", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdatePricingRuleDto.prototype, "scopeProductIds", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdatePricingRuleDto.prototype, "scopeCollectionIds", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "scopeTags", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdatePricingRuleDto.prototype, "scopeVariantIds", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DiscountType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "discountType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdatePricingRuleDto.prototype, "discountValue", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdatePricingRuleDto.prototype, "discountPercentage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdatePricingRuleDto.prototype, "qtyBreaks", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdatePricingRuleDto.prototype, "minCartAmount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdatePricingRuleDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdatePricingRuleDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "validFrom", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "validUntil", void 0);
class ToggleRuleDto {
    isActive;
}
exports.ToggleRuleDto = ToggleRuleDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ToggleRuleDto.prototype, "isActive", void 0);
class GetRulesQueryDto {
    isActive;
    companyId;
    companyUserId;
    targetType;
}
exports.GetRulesQueryDto = GetRulesQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GetRulesQueryDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GetRulesQueryDto.prototype, "companyId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GetRulesQueryDto.prototype, "companyUserId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GetRulesQueryDto.prototype, "targetType", void 0);
//# sourceMappingURL=pricing.dto.js.map