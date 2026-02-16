"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyCustomersModule = void 0;
const common_1 = require("@nestjs/common");
const customer_intelligence_service_1 = require("../customers/customer-intelligence.service");
const customer_lists_controller_1 = require("../customers/customer-lists.controller");
const customer_lists_service_1 = require("../customers/customer-lists.service");
const proactive_offer_controller_1 = require("../customers/proactive-offer.controller");
const proactive_offer_service_1 = require("../customers/proactive-offer.service");
const shopify_customers_controller_1 = require("./shopify-customers.controller");
const shopify_customers_service_1 = require("./shopify-customers.service");
let ShopifyCustomersModule = class ShopifyCustomersModule {
};
exports.ShopifyCustomersModule = ShopifyCustomersModule;
exports.ShopifyCustomersModule = ShopifyCustomersModule = __decorate([
    (0, common_1.Module)({
        controllers: [shopify_customers_controller_1.ShopifyCustomersController, proactive_offer_controller_1.ProactiveOfferController, customer_lists_controller_1.CustomerListsController],
        providers: [shopify_customers_service_1.ShopifyCustomersService, customer_intelligence_service_1.CustomerIntelligenceService, proactive_offer_service_1.ProactiveOfferService, customer_lists_service_1.CustomerListsService],
        exports: [shopify_customers_service_1.ShopifyCustomersService, customer_intelligence_service_1.CustomerIntelligenceService, proactive_offer_service_1.ProactiveOfferService, customer_lists_service_1.CustomerListsService],
    })
], ShopifyCustomersModule);
//# sourceMappingURL=shopify-customers.module.js.map