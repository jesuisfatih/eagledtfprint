"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiStoreModule = void 0;
const common_1 = require("@nestjs/common");
const dittofeed_module_1 = require("../dittofeed/dittofeed.module");
const prisma_module_1 = require("../prisma/prisma.module");
const multi_store_controller_1 = require("./multi-store.controller");
const multi_store_service_1 = require("./multi-store.service");
let MultiStoreModule = class MultiStoreModule {
};
exports.MultiStoreModule = MultiStoreModule;
exports.MultiStoreModule = MultiStoreModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, dittofeed_module_1.DittofeedModule],
        controllers: [multi_store_controller_1.MultiStoreController],
        providers: [multi_store_service_1.MultiStoreService],
        exports: [multi_store_service_1.MultiStoreService],
    })
], MultiStoreModule);
//# sourceMappingURL=multi-store.module.js.map