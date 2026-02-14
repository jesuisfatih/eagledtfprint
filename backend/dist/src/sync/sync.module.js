"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncModule = void 0;
const axios_1 = require("@nestjs/axios");
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const shopify_module_1 = require("../shopify/shopify.module");
const sync_state_service_1 = require("./sync-state.service");
const sync_controller_1 = require("./sync.controller");
const sync_service_1 = require("./sync.service");
const customers_sync_worker_1 = require("./workers/customers-sync.worker");
const orders_sync_worker_1 = require("./workers/orders-sync.worker");
const products_sync_worker_1 = require("./workers/products-sync.worker");
let SyncModule = class SyncModule {
};
exports.SyncModule = SyncModule;
exports.SyncModule = SyncModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            shopify_module_1.ShopifyModule,
            bull_1.BullModule.registerQueue({
                name: 'customers-sync',
            }, {
                name: 'products-sync',
            }, {
                name: 'orders-sync',
            }),
        ],
        controllers: [sync_controller_1.SyncController],
        providers: [
            sync_service_1.SyncService,
            sync_state_service_1.SyncStateService,
            customers_sync_worker_1.CustomersSyncWorker,
            products_sync_worker_1.ProductsSyncWorker,
            orders_sync_worker_1.OrdersSyncWorker,
        ],
        exports: [sync_service_1.SyncService, sync_state_service_1.SyncStateService],
    })
], SyncModule);
//# sourceMappingURL=sync.module.js.map