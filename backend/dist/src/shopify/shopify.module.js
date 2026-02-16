"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyModule = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const shopify_admin_discount_service_1 = require("./shopify-admin-discount.service");
const shopify_customer_sync_service_1 = require("./shopify-customer-sync.service");
const shopify_graphql_service_1 = require("./shopify-graphql.service");
const shopify_rest_service_1 = require("./shopify-rest.service");
const shopify_sso_service_1 = require("./shopify-sso.service");
const shopify_storefront_service_1 = require("./shopify-storefront.service");
const shopify_token_refresh_service_1 = require("./shopify-token-refresh.service");
const shopify_service_1 = require("./shopify.service");
let ShopifyModule = class ShopifyModule {
};
exports.ShopifyModule = ShopifyModule;
exports.ShopifyModule = ShopifyModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, config_1.ConfigModule],
        providers: [
            shopify_graphql_service_1.ShopifyGraphqlService,
            shopify_customer_sync_service_1.ShopifyCustomerSyncService,
            shopify_sso_service_1.ShopifySsoService,
            shopify_service_1.ShopifyService,
            shopify_rest_service_1.ShopifyRestService,
            shopify_admin_discount_service_1.ShopifyAdminDiscountService,
            shopify_storefront_service_1.ShopifyStorefrontService,
            shopify_token_refresh_service_1.ShopifyTokenRefreshService,
            prisma_service_1.PrismaService,
        ],
        exports: [
            shopify_graphql_service_1.ShopifyGraphqlService,
            shopify_customer_sync_service_1.ShopifyCustomerSyncService,
            shopify_sso_service_1.ShopifySsoService,
            shopify_service_1.ShopifyService,
            shopify_rest_service_1.ShopifyRestService,
            shopify_admin_discount_service_1.ShopifyAdminDiscountService,
            shopify_storefront_service_1.ShopifyStorefrontService,
            shopify_token_refresh_service_1.ShopifyTokenRefreshService,
        ],
    })
], ShopifyModule);
//# sourceMappingURL=shopify.module.js.map