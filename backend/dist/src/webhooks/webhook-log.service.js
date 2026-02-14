"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WebhookLogService = class WebhookLogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logWebhook(type, payload, status, error) {
        const merchant = await this.prisma.merchant.findFirst();
        if (!merchant)
            return;
        await this.prisma.activityLog.create({
            data: {
                merchantId: merchant.id,
                eventType: `webhook_${type}`,
                payload: payload,
                createdAt: new Date(),
            },
        });
    }
};
exports.WebhookLogService = WebhookLogService;
exports.WebhookLogService = WebhookLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WebhookLogService);
//# sourceMappingURL=webhook-log.service.js.map