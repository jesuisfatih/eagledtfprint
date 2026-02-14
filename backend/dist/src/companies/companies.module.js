"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesModule = void 0;
const common_1 = require("@nestjs/common");
const companies_service_1 = require("./companies.service");
const companies_controller_1 = require("./companies.controller");
const company_users_service_1 = require("./company-users.service");
const company_users_controller_1 = require("./company-users.controller");
const shopify_company_sync_service_1 = require("./shopify-company-sync.service");
const shopify_module_1 = require("../shopify/shopify.module");
let CompaniesModule = class CompaniesModule {
};
exports.CompaniesModule = CompaniesModule;
exports.CompaniesModule = CompaniesModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => shopify_module_1.ShopifyModule)],
        controllers: [companies_controller_1.CompaniesController, company_users_controller_1.CompanyUsersController],
        providers: [companies_service_1.CompaniesService, company_users_service_1.CompanyUsersService, shopify_company_sync_service_1.ShopifyCompanySyncService],
        exports: [companies_service_1.CompaniesService, company_users_service_1.CompanyUsersService],
    })
], CompaniesModule);
//# sourceMappingURL=companies.module.js.map