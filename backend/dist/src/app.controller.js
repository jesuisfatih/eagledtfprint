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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_service_1 = require("./app.service");
const public_decorator_1 = require("./auth/decorators/public.decorator");
const prisma_service_1 = require("./prisma/prisma.service");
const redis_service_1 = require("./redis/redis.service");
let AppController = class AppController {
    appService;
    prisma;
    redis;
    config;
    constructor(appService, prisma, redis, config) {
        this.appService = appService;
        this.prisma = prisma;
        this.redis = redis;
        this.config = config;
    }
    getRoot(shop, host, res) {
        const adminUrl = this.config.get('ADMIN_URL', 'https://app.eagledtfsupply.com');
        if (host || shop) {
            const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Eagle B2B Engine</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f6f7; color: #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { text-align: center; padding: 48px; max-width: 480px; }
    .logo { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 15px; color: #616161; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: inline-block; padding: 12px 24px; background: #007aff; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; transition: background 0.2s; }
    .btn:hover { background: #0056b3; }
    .status { margin-top: 24px; padding: 12px 16px; background: #e8f5e9; border-radius: 8px; font-size: 13px; color: #2e7d32; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🦅</div>
    <h1>Eagle B2B Engine</h1>
    <p>Your B2B commerce engine is active and running. Manage pricing rules, company accounts, fingerprinting, and real-time visitor tracking from the admin panel.</p>
    <a href="${adminUrl}" target="_blank" class="btn">Open Admin Panel →</a>
    <div class="status">✅ Connected to ${shop || 'your Shopify store'}</div>
  </div>
</body>
</html>`;
            return res.type('html').send(html);
        }
        return res.json({
            name: 'Eagle B2B Engine',
            version: '1.0.0',
            status: 'running',
            admin: adminUrl,
        });
    }
    async getHealth() {
        const checks = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            checks.database = { status: 'ok' };
        }
        catch (error) {
            checks.database = { status: 'error', message: error.message };
            checks.status = 'degraded';
        }
        try {
            const client = this.redis.getClient();
            await client.ping();
            checks.redis = { status: 'ok' };
        }
        catch (error) {
            checks.redis = { status: 'error', message: error.message };
            checks.status = 'degraded';
        }
        return checks;
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Query)('shop')),
    __param(1, (0, common_1.Query)('host')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getRoot", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, public_decorator_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getHealth", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        config_1.ConfigService])
], AppController);
//# sourceMappingURL=app.controller.js.map