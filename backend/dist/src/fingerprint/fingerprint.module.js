"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FingerprintModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const fingerprint_controller_1 = require("./fingerprint.controller");
const fingerprint_service_1 = require("./fingerprint.service");
let FingerprintModule = class FingerprintModule {
};
exports.FingerprintModule = FingerprintModule;
exports.FingerprintModule = FingerprintModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [fingerprint_controller_1.FingerprintController],
        providers: [fingerprint_service_1.FingerprintService],
        exports: [fingerprint_service_1.FingerprintService],
    })
], FingerprintModule);
//# sourceMappingURL=fingerprint.module.js.map