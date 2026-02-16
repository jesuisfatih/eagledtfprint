"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksModule = void 0;
const common_1 = require("@nestjs/common");
const dittofeed_module_1 = require("../dittofeed/dittofeed.module");
const pickup_module_1 = require("../pickup/pickup.module");
const shopify_module_1 = require("../shopify/shopify.module");
const customers_handler_1 = require("./handlers/customers.handler");
const orders_handler_1 = require("./handlers/orders.handler");
const shopify_webhook_sync_service_1 = require("./shopify-webhook-sync.service");
const webhooks_controller_1 = require("./webhooks.controller");
let WebhooksModule = class WebhooksModule {
};
exports.WebhooksModule = WebhooksModule;
exports.WebhooksModule = WebhooksModule = __decorate([
    (0, common_1.Module)({
        imports: [shopify_module_1.ShopifyModule, pickup_module_1.PickupModule, dittofeed_module_1.DittofeedModule],
        controllers: [webhooks_controller_1.WebhooksController],
        providers: [orders_handler_1.OrdersHandler, customers_handler_1.CustomersHandler, shopify_webhook_sync_service_1.ShopifyWebhookSyncService],
    })
], WebhooksModule);
//# sourceMappingURL=webhooks.module.js.map