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
var SyncStateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncStateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const LOCK_TTL_MS = 30 * 60 * 1000;
const MAX_CONSECUTIVE_FAILURES = 5;
let SyncStateService = SyncStateService_1 = class SyncStateService {
    prisma;
    logger = new common_1.Logger(SyncStateService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getState(merchantId, entityType) {
        return this.prisma.syncState.upsert({
            where: {
                merchantId_entityType: { merchantId, entityType },
            },
            create: {
                merchantId,
                entityType,
                status: 'idle',
            },
            update: {},
        });
    }
    async getAllStates(merchantId) {
        const entityTypes = ['customers', 'products', 'orders'];
        for (const entityType of entityTypes) {
            await this.prisma.syncState.upsert({
                where: {
                    merchantId_entityType: { merchantId, entityType },
                },
                create: {
                    merchantId,
                    entityType,
                    status: 'idle',
                },
                update: {},
            });
        }
        return this.prisma.syncState.findMany({
            where: { merchantId },
            orderBy: { entityType: 'asc' },
        });
    }
    async isRunning(merchantId, entityType) {
        const state = await this.getState(merchantId, entityType);
        if (!state.isLocked)
            return false;
        if (state.lockExpiresAt && new Date() > state.lockExpiresAt) {
            this.logger.warn(`Stale lock detected for ${entityType} sync (merchant: ${merchantId}). ` +
                `Lock expired at ${state.lockExpiresAt.toISOString()}. Releasing...`);
            await this.releaseLock(merchantId, entityType, 'failed', 'Stale lock auto-released');
            return false;
        }
        return true;
    }
    async shouldSkip(merchantId, entityType) {
        const state = await this.getState(merchantId, entityType);
        return state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
    }
    async acquireLock(merchantId, entityType) {
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);
            const result = await this.prisma.syncState.updateMany({
                where: {
                    merchantId,
                    entityType,
                    isLocked: false,
                },
                data: {
                    isLocked: true,
                    lockedAt: now,
                    lockExpiresAt: expiresAt,
                    status: 'running',
                    lastStartedAt: now,
                    lastError: null,
                },
            });
            if (result.count === 0) {
                const state = await this.getState(merchantId, entityType);
                if (state.isLocked && state.lockExpiresAt && new Date() > state.lockExpiresAt) {
                    this.logger.warn(`Force-acquiring expired lock for ${entityType} (merchant: ${merchantId})`);
                    await this.prisma.syncState.update({
                        where: { merchantId_entityType: { merchantId, entityType } },
                        data: {
                            isLocked: true,
                            lockedAt: now,
                            lockExpiresAt: expiresAt,
                            status: 'running',
                            lastStartedAt: now,
                            lastError: null,
                        },
                    });
                    return true;
                }
                return false;
            }
            this.logger.debug(`Lock acquired for ${entityType} sync (merchant: ${merchantId})`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to acquire lock for ${entityType}`, error);
            return false;
        }
    }
    async releaseLock(merchantId, entityType, finalStatus, error) {
        const now = new Date();
        const updateData = {
            isLocked: false,
            lockedAt: null,
            lockExpiresAt: null,
            status: finalStatus === 'completed' ? 'completed' : 'failed',
        };
        if (finalStatus === 'completed') {
            updateData.lastCompletedAt = now;
            updateData.consecutiveFailures = 0;
            updateData.lastError = null;
        }
        else {
            updateData.lastFailedAt = now;
            updateData.lastError = error || 'Unknown error';
            const state = await this.getState(merchantId, entityType);
            updateData.consecutiveFailures = state.consecutiveFailures + 1;
        }
        await this.prisma.syncState.update({
            where: { merchantId_entityType: { merchantId, entityType } },
            data: updateData,
        });
        this.logger.debug(`Lock released for ${entityType} sync (merchant: ${merchantId}), status: ${finalStatus}`);
    }
    async updateCursor(merchantId, entityType, cursor, lastSyncedId) {
        await this.prisma.syncState.update({
            where: { merchantId_entityType: { merchantId, entityType } },
            data: {
                lastCursor: cursor,
                ...(lastSyncedId !== undefined ? { lastSyncedId } : {}),
            },
        });
    }
    async updateMetrics(merchantId, entityType, recordsProcessed) {
        const state = await this.getState(merchantId, entityType);
        await this.prisma.syncState.update({
            where: { merchantId_entityType: { merchantId, entityType } },
            data: {
                lastRunRecords: recordsProcessed,
                totalRecordsSynced: state.totalRecordsSynced + recordsProcessed,
            },
        });
    }
    async updateMerchantLastSync(merchantId) {
        await this.prisma.merchant.update({
            where: { id: merchantId },
            data: { lastSyncAt: new Date() },
        });
    }
    async resetFailures(merchantId, entityType) {
        await this.prisma.syncState.update({
            where: { merchantId_entityType: { merchantId, entityType } },
            data: {
                consecutiveFailures: 0,
                lastError: null,
                status: 'idle',
            },
        });
        this.logger.log(`Reset failures for ${entityType} sync (merchant: ${merchantId})`);
    }
    async resetAll(merchantId) {
        await this.prisma.syncState.updateMany({
            where: { merchantId },
            data: {
                isLocked: false,
                lockedAt: null,
                lockExpiresAt: null,
                status: 'idle',
                lastCursor: null,
                lastSyncedId: null,
                consecutiveFailures: 0,
                lastError: null,
            },
        });
        this.logger.log(`Reset all sync states for merchant: ${merchantId}`);
    }
    async getComprehensiveStatus(merchantId) {
        const [states, recentLogs, merchant] = await Promise.all([
            this.getAllStates(merchantId),
            this.prisma.syncLog.findMany({
                where: { merchantId },
                orderBy: { startedAt: 'desc' },
                take: 20,
            }),
            this.prisma.merchant.findUnique({
                where: { id: merchantId },
                select: { lastSyncAt: true },
            }),
        ]);
        const isAnySyncing = states.some(s => s.isLocked);
        const hasErrors = states.some(s => s.consecutiveFailures > 0);
        return {
            merchantLastSyncAt: merchant?.lastSyncAt,
            isAnySyncing,
            hasErrors,
            entities: states.reduce((acc, state) => {
                acc[state.entityType] = {
                    status: state.status,
                    isRunning: state.isLocked,
                    lastCompletedAt: state.lastCompletedAt,
                    lastFailedAt: state.lastFailedAt,
                    lastError: state.lastError,
                    totalRecordsSynced: state.totalRecordsSynced,
                    lastRunRecords: state.lastRunRecords,
                    consecutiveFailures: state.consecutiveFailures,
                    lastCursor: state.lastCursor,
                };
                return acc;
            }, {}),
            recentLogs,
        };
    }
};
exports.SyncStateService = SyncStateService;
exports.SyncStateService = SyncStateService = SyncStateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SyncStateService);
//# sourceMappingURL=sync-state.service.js.map