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
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const sync_state_service_1 = require("./sync-state.service");
let SyncService = SyncService_1 = class SyncService {
    prisma;
    syncState;
    customersQueue;
    productsQueue;
    ordersQueue;
    logger = new common_1.Logger(SyncService_1.name);
    constructor(prisma, syncState, customersQueue, productsQueue, ordersQueue) {
        this.prisma = prisma;
        this.syncState = syncState;
        this.customersQueue = customersQueue;
        this.productsQueue = productsQueue;
        this.ordersQueue = ordersQueue;
    }
    async triggerInitialSync(merchantId) {
        this.logger.log(`Triggering initial sync for merchant: ${merchantId}`);
        await this.syncState.resetAll(merchantId);
        const syncLog = await this.prisma.syncLog.create({
            data: {
                merchantId,
                syncType: 'initial_sync',
                status: 'running',
            },
        });
        await this.customersQueue.add('sync', {
            merchantId,
            syncLogId: syncLog.id,
            isInitial: true,
        });
        await this.productsQueue.add('sync', {
            merchantId,
            syncLogId: syncLog.id,
            isInitial: true,
        });
        await this.ordersQueue.add('sync', {
            merchantId,
            syncLogId: syncLog.id,
            isInitial: true,
        });
        return { message: 'Initial sync started', syncLogId: syncLog.id };
    }
    async triggerCustomersSync(merchantId) {
        return this.triggerEntitySync(merchantId, 'customers', this.customersQueue);
    }
    async triggerProductsSync(merchantId) {
        return this.triggerEntitySync(merchantId, 'products', this.productsQueue);
    }
    async triggerOrdersSync(merchantId) {
        return this.triggerEntitySync(merchantId, 'orders', this.ordersQueue);
    }
    async triggerEntitySync(merchantId, entityType, queue) {
        const isRunning = await this.syncState.isRunning(merchantId, entityType);
        if (isRunning) {
            this.logger.debug(`${entityType} sync already running for merchant ${merchantId}, skipping`);
            return { message: `${entityType} sync already running`, skipped: true };
        }
        const shouldSkip = await this.syncState.shouldSkip(merchantId, entityType);
        if (shouldSkip) {
            this.logger.warn(`${entityType} sync has too many consecutive failures for merchant ${merchantId}. ` +
                `Use reset endpoint to re-enable.`);
            return {
                message: `${entityType} sync disabled due to consecutive failures. Use reset to re-enable.`,
                skipped: true,
            };
        }
        await queue.add('sync', { merchantId });
        return { message: `${entityType} sync queued` };
    }
    async getSyncStatus(merchantId) {
        return this.syncState.getComprehensiveStatus(merchantId);
    }
    async resetEntitySync(merchantId, entityType) {
        await this.syncState.resetFailures(merchantId, entityType);
        return { message: `${entityType} sync reset successfully` };
    }
    async resetAllSync(merchantId) {
        await this.syncState.resetAll(merchantId);
        return { message: 'All sync states reset successfully' };
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bull_1.InjectQueue)('customers-sync')),
    __param(3, (0, bull_1.InjectQueue)('products-sync')),
    __param(4, (0, bull_1.InjectQueue)('orders-sync')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sync_state_service_1.SyncStateService, Object, Object, Object])
], SyncService);
//# sourceMappingURL=sync.service.js.map