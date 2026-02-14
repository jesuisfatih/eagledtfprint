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
var SyncScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const sync_state_service_1 = require("../sync/sync-state.service");
const sync_service_1 = require("../sync/sync.service");
let SyncScheduler = SyncScheduler_1 = class SyncScheduler {
    prisma;
    syncService;
    syncState;
    logger = new common_1.Logger(SyncScheduler_1.name);
    constructor(prisma, syncService, syncState) {
        this.prisma = prisma;
        this.syncService = syncService;
        this.syncState = syncState;
    }
    async handleCustomersSync() {
        this.logger.debug('Running scheduled customers sync...');
        await this.runSyncForAllMerchants('customers');
    }
    async handleProductsSync() {
        this.logger.debug('Running scheduled products sync...');
        await this.runSyncForAllMerchants('products');
    }
    async handleOrdersSync() {
        this.logger.debug('Running scheduled orders sync...');
        await this.runSyncForAllMerchants('orders');
    }
    async runSyncForAllMerchants(entityType) {
        const merchants = await this.prisma.merchant.findMany({
            where: { status: 'active' },
        });
        for (const merchant of merchants) {
            try {
                const isRunning = await this.syncState.isRunning(merchant.id, entityType);
                if (isRunning) {
                    this.logger.debug(`Skipping ${entityType} sync for ${merchant.shopDomain}: already running`);
                    continue;
                }
                const shouldSkip = await this.syncState.shouldSkip(merchant.id, entityType);
                if (shouldSkip) {
                    this.logger.debug(`Skipping ${entityType} sync for ${merchant.shopDomain}: too many consecutive failures`);
                    continue;
                }
                switch (entityType) {
                    case 'customers':
                        await this.syncService.triggerCustomersSync(merchant.id);
                        break;
                    case 'products':
                        await this.syncService.triggerProductsSync(merchant.id);
                        break;
                    case 'orders':
                        await this.syncService.triggerOrdersSync(merchant.id);
                        break;
                }
            }
            catch (error) {
                this.logger.error(`Failed to trigger ${entityType} sync for merchant ${merchant.shopDomain}`, error);
            }
        }
    }
};
exports.SyncScheduler = SyncScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyncScheduler.prototype, "handleCustomersSync", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyncScheduler.prototype, "handleProductsSync", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyncScheduler.prototype, "handleOrdersSync", null);
exports.SyncScheduler = SyncScheduler = SyncScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sync_service_1.SyncService,
        sync_state_service_1.SyncStateService])
], SyncScheduler);
//# sourceMappingURL=sync.scheduler.js.map