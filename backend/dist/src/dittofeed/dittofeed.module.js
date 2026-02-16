"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DittofeedModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const cross_sell_service_1 = require("./cross-sell.service");
const dittofeed_admin_service_1 = require("./dittofeed-admin.service");
const dittofeed_db_reader_service_1 = require("./dittofeed-db-reader.service");
const dittofeed_embedded_controller_1 = require("./dittofeed-embedded.controller");
const dittofeed_controller_1 = require("./dittofeed.controller");
const dittofeed_service_1 = require("./dittofeed.service");
let DittofeedModule = class DittofeedModule {
};
exports.DittofeedModule = DittofeedModule;
exports.DittofeedModule = DittofeedModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [dittofeed_controller_1.DittofeedController, dittofeed_embedded_controller_1.DittofeedEmbeddedController],
        providers: [dittofeed_service_1.DittofeedService, dittofeed_admin_service_1.DittofeedAdminService, cross_sell_service_1.CrossSellService, dittofeed_db_reader_service_1.DittofeedDbReaderService],
        exports: [dittofeed_service_1.DittofeedService, dittofeed_admin_service_1.DittofeedAdminService, cross_sell_service_1.CrossSellService, dittofeed_db_reader_service_1.DittofeedDbReaderService],
    })
], DittofeedModule);
//# sourceMappingURL=dittofeed.module.js.map