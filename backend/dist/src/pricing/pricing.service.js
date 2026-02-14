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
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const pricing_calculator_service_1 = require("./pricing-calculator.service");
const pricing_rules_service_1 = require("./pricing-rules.service");
let PricingService = class PricingService {
    calculator;
    rulesService;
    constructor(calculator, rulesService) {
        this.calculator = calculator;
        this.rulesService = rulesService;
    }
    async calculatePrices(context) {
        return this.calculator.calculatePrices(context);
    }
    async calculateCartPricing(cartId) {
        return this.calculator.calculateCartPricing(cartId);
    }
    async createRule(merchantId, dto) {
        return this.rulesService.create(merchantId, dto);
    }
    async getRules(merchantId, filters) {
        return this.rulesService.findAll(merchantId, filters);
    }
    async getRule(id, merchantId) {
        return this.rulesService.findOne(id, merchantId);
    }
    async updateRule(id, merchantId, dto) {
        return this.rulesService.update(id, merchantId, dto);
    }
    async deleteRule(id, merchantId) {
        return this.rulesService.delete(id, merchantId);
    }
    async toggleRuleActive(id, merchantId, isActive) {
        return this.rulesService.toggleActive(id, merchantId, isActive);
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pricing_calculator_service_1.PricingCalculatorService,
        pricing_rules_service_1.PricingRulesService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map