"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionModule = void 0;
const common_1 = require("@nestjs/common");
const dittofeed_module_1 = require("../dittofeed/dittofeed.module");
const penpot_module_1 = require("../penpot/penpot.module");
const pickup_module_1 = require("../pickup/pickup.module");
const prisma_module_1 = require("../prisma/prisma.module");
const factory_floor_controller_1 = require("./factory-floor.controller");
const factory_floor_service_1 = require("./factory-floor.service");
const production_controller_1 = require("./production.controller");
const production_gateway_1 = require("./production.gateway");
const production_service_1 = require("./production.service");
let ProductionModule = class ProductionModule {
};
exports.ProductionModule = ProductionModule;
exports.ProductionModule = ProductionModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, dittofeed_module_1.DittofeedModule, penpot_module_1.PenpotModule, pickup_module_1.PickupModule],
        controllers: [production_controller_1.ProductionController, factory_floor_controller_1.FactoryFloorController],
        providers: [production_service_1.ProductionService, production_gateway_1.ProductionGateway, factory_floor_service_1.FactoryFloorService],
        exports: [production_service_1.ProductionService, production_gateway_1.ProductionGateway, factory_floor_service_1.FactoryFloorService],
    })
], ProductionModule);
//# sourceMappingURL=production.module.js.map