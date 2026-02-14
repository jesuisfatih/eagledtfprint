"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingModule = void 0;
const common_1 = require("@nestjs/common");
const pricing_service_1 = require("./pricing.service");
const pricing_rules_service_1 = require("./pricing-rules.service");
const pricing_calculator_service_1 = require("./pricing-calculator.service");
const pricing_controller_1 = require("./pricing.controller");
const prisma_service_1 = require("../prisma/prisma.service");
let PricingModule = class PricingModule {
};
exports.PricingModule = PricingModule;
exports.PricingModule = PricingModule = __decorate([
    (0, common_1.Module)({
        controllers: [pricing_controller_1.PricingController],
        providers: [pricing_service_1.PricingService, pricing_rules_service_1.PricingRulesService, pricing_calculator_service_1.PricingCalculatorService, prisma_service_1.PrismaService],
        exports: [pricing_service_1.PricingService, pricing_calculator_service_1.PricingCalculatorService, pricing_rules_service_1.PricingRulesService],
    })
], PricingModule);
//# sourceMappingURL=pricing.module.js.map