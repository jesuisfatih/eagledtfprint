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
var ProductionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const dittofeed_service_1 = require("../dittofeed/dittofeed.service");
const prisma_service_1 = require("../prisma/prisma.service");
const STATUS_TRANSITIONS = {
    QUEUED: ['PREPRESS', 'CANCELLED'],
    PREPRESS: ['PRINTING', 'QUEUED', 'CANCELLED'],
    PRINTING: ['CURING', 'PREPRESS', 'CANCELLED'],
    CURING: ['CUTTING', 'PRINTING', 'CANCELLED'],
    CUTTING: ['QC_CHECK', 'CURING', 'CANCELLED'],
    QC_CHECK: ['PACKAGING', 'CUTTING', 'CANCELLED'],
    PACKAGING: ['READY', 'QC_CHECK', 'CANCELLED'],
    READY: ['PICKED_UP', 'SHIPPED', 'CANCELLED'],
    PICKED_UP: ['COMPLETED'],
    SHIPPED: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
};
const STATUS_TIMESTAMP_FIELD = {
    QUEUED: 'queuedAt',
    PREPRESS: 'prepressStartAt',
    PRINTING: 'printStartAt',
    CURING: 'cureStartAt',
    CUTTING: 'cutStartAt',
    QC_CHECK: 'qcStartAt',
    PACKAGING: 'packagingStartAt',
    READY: 'readyAt',
    COMPLETED: 'completedAt',
};
let ProductionService = ProductionService_1 = class ProductionService {
    prisma;
    dittofeedService;
    logger = new common_1.Logger(ProductionService_1.name);
    constructor(prisma, dittofeedService) {
        this.prisma = prisma;
        this.dittofeedService = dittofeedService;
    }
    async createJob(input) {
        const area = input.widthInch * input.heightInch;
        const estimatedMinutes = Math.ceil(area / 50) + 5;
        const job = await this.prisma.productionJob.create({
            data: {
                merchantId: input.merchantId,
                orderId: input.orderId,
                designProjectId: input.designProjectId || null,
                widthInch: input.widthInch,
                heightInch: input.heightInch,
                areaSquareInch: area,
                productType: input.productType,
                quantity: input.quantity || 1,
                designFileUrl: input.designFileUrl || null,
                dpi: input.dpi || null,
                priority: input.priority || 'STANDARD',
                estimatedPrintMinutes: estimatedMinutes,
                estimatedReadyAt: new Date(Date.now() + estimatedMinutes * 60 * 1000 + 30 * 60 * 1000),
                notes: input.notes || null,
            },
            include: {
                order: { select: { shopifyOrderNumber: true, email: true, companyUserId: true } },
            },
        });
        this.logger.log(`Production job created: ${job.id} for order ${job.order?.shopifyOrderNumber} — ${input.productType} ${input.widthInch}"x${input.heightInch}"`);
        return job;
    }
    async createJobsFromOrder(merchantId, orderId) {
        const order = await this.prisma.orderLocal.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                shopifyOrderNumber: true,
                lineItems: true,
                companyUserId: true,
                designProjects: { select: { id: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        const lineItems = order.lineItems || [];
        const jobs = [];
        for (const item of lineItems) {
            const dims = this.parseDimensions(item);
            if (!dims)
                continue;
            const productType = this.detectProductType(item);
            const job = await this.createJob({
                merchantId,
                orderId: order.id,
                designProjectId: order.designProjects?.[0]?.id,
                widthInch: dims.width,
                heightInch: dims.height,
                productType,
                quantity: item.quantity || 1,
                dpi: 300,
                priority: 'STANDARD',
            });
            jobs.push(job);
        }
        this.logger.log(`Created ${jobs.length} production jobs for order #${order.shopifyOrderNumber}`);
        return { created: jobs.length, jobs };
    }
    async moveToStatus(jobId, newStatus, operatorName) {
        const job = await this.prisma.productionJob.findUnique({
            where: { id: jobId },
            include: {
                order: { select: { shopifyOrderNumber: true, email: true, companyUserId: true } },
            },
        });
        if (!job)
            throw new common_1.NotFoundException(`Job ${jobId} not found`);
        const currentStatus = job.status;
        const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
            throw new common_1.BadRequestException(`Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`);
        }
        const updateData = {
            status: newStatus,
        };
        const timestampField = STATUS_TIMESTAMP_FIELD[newStatus];
        if (timestampField) {
            updateData[timestampField] = new Date();
        }
        if (operatorName) {
            updateData.operatorName = operatorName;
        }
        const updated = await this.prisma.productionJob.update({
            where: { id: jobId },
            data: updateData,
            include: {
                order: { select: { shopifyOrderNumber: true, email: true, companyUserId: true } },
                printer: { select: { name: true } },
            },
        });
        this.logger.log(`Job ${jobId} moved: ${currentStatus} → ${newStatus} (Order #${updated.order?.shopifyOrderNumber})`);
        if (updated.order?.companyUserId) {
            try {
                await this.sendProductionEvent(updated, currentStatus, newStatus);
            }
            catch (err) {
                this.logger.warn(`Dittofeed production event failed: ${err.message}`);
            }
        }
        return updated;
    }
    async batchMoveToStatus(jobIds, newStatus, operatorName) {
        const results = [];
        for (const jobId of jobIds) {
            try {
                await this.moveToStatus(jobId, newStatus, operatorName);
                results.push({ id: jobId, success: true });
            }
            catch (err) {
                results.push({ id: jobId, success: false, error: err.message });
            }
        }
        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        return { succeeded, failed, results };
    }
    async getKanbanBoard(merchantId) {
        const activeStatuses = [
            'QUEUED', 'PREPRESS', 'PRINTING', 'CURING',
            'CUTTING', 'QC_CHECK', 'PACKAGING', 'READY',
            'PICKED_UP', 'SHIPPED', 'COMPLETED', 'CANCELLED',
        ];
        const jobs = await this.prisma.productionJob.findMany({
            where: {
                merchantId,
                status: { in: activeStatuses },
            },
            include: {
                order: {
                    select: {
                        shopifyOrderNumber: true,
                        email: true,
                        companyId: true,
                        company: { select: { name: true } },
                    },
                },
                printer: { select: { name: true, status: true } },
            },
            orderBy: [
                { priority: 'desc' },
                { queuedAt: 'asc' },
            ],
        });
        const board = {
            QUEUED: [],
            PREPRESS: [],
            PRINTING: [],
            CURING: [],
            CUTTING: [],
            QC_CHECK: [],
            PACKAGING: [],
            READY: [],
            PICKED_UP: [],
            SHIPPED: [],
            COMPLETED: [],
            CANCELLED: [],
        };
        for (const job of jobs) {
            const status = job.status;
            if (board[status]) {
                board[status].push({
                    id: job.id,
                    orderNumber: job.order?.shopifyOrderNumber || '',
                    companyName: job.order?.company?.name || '',
                    email: job.order?.email || '',
                    productType: job.productType,
                    dimensions: `${job.widthInch}"×${job.heightInch}"`,
                    area: job.areaSquareInch,
                    priority: job.priority,
                    printer: job.printer?.name || null,
                    operator: job.operatorName || null,
                    queuedAt: job.queuedAt,
                    estimatedReadyAt: job.estimatedReadyAt,
                    isOverdue: job.estimatedReadyAt ? new Date() > job.estimatedReadyAt : false,
                    waitingMinutes: job.queuedAt ? Math.round((Date.now() - job.queuedAt.getTime()) / 60000) : 0,
                });
            }
        }
        return board;
    }
    async getPrinters(merchantId) {
        return this.prisma.printer.findMany({
            where: { merchantId },
            include: {
                jobs: {
                    where: { status: { in: ['PRINTING', 'QUEUED', 'PREPRESS'] } },
                    select: { id: true, status: true, productType: true, estimatedPrintMinutes: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async createPrinter(merchantId, data) {
        return this.prisma.printer.create({
            data: {
                merchantId,
                name: data.name,
                model: data.model,
                maxWidthInch: data.maxWidthInch,
                supportedTypes: data.supportedTypes || ['dtf'],
                location: data.location || null,
            },
        });
    }
    async updateInkLevels(printerId, levels) {
        return this.prisma.printer.update({
            where: { id: printerId },
            data: {
                inkCyan: levels.cyan,
                inkMagenta: levels.magenta,
                inkYellow: levels.yellow,
                inkBlack: levels.black,
                inkWhite: levels.white,
            },
        });
    }
    async updatePrinterStatus(printerId, status, notes) {
        return this.prisma.printer.update({
            where: { id: printerId },
            data: {
                status: status,
                maintenanceNotes: status === 'MAINTENANCE' ? notes : undefined,
                lastMaintenanceAt: status === 'MAINTENANCE' ? new Date() : undefined,
            },
        });
    }
    async assignToPrinter(jobId, printerId) {
        const printer = await this.prisma.printer.findUnique({ where: { id: printerId } });
        if (!printer)
            throw new common_1.NotFoundException(`Printer ${printerId} not found`);
        const job = await this.prisma.productionJob.findUnique({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException(`Job ${jobId} not found`);
        if (job.widthInch > printer.maxWidthInch) {
            throw new common_1.BadRequestException(`Job width ${job.widthInch}" exceeds printer max width ${printer.maxWidthInch}"`);
        }
        if (printer.supportedTypes.length > 0 && !printer.supportedTypes.includes(job.productType)) {
            throw new common_1.BadRequestException(`Printer ${printer.name} does not support product type: ${job.productType}`);
        }
        return this.prisma.productionJob.update({
            where: { id: jobId },
            data: { printerId },
        });
    }
    async createGangSheetBatch(merchantId, data) {
        const totalArea = data.sheetWidth * data.sheetHeight;
        const jobs = await this.prisma.productionJob.findMany({
            where: { id: { in: data.jobIds }, merchantId },
        });
        if (jobs.length === 0)
            throw new common_1.BadRequestException('No valid jobs found');
        const usedArea = jobs.reduce((sum, j) => sum + (j.areaSquareInch || 0), 0);
        const fillRate = Math.min(usedArea / totalArea, 1);
        const wasteArea = totalArea - usedArea;
        const batch = await this.prisma.gangSheetBatch.create({
            data: {
                merchantId,
                sheetWidth: data.sheetWidth,
                sheetHeight: data.sheetHeight,
                fillRate,
                usedArea,
                totalArea,
                wasteArea,
                isMultiOrder: new Set(jobs.map((j) => j.orderId)).size > 1,
                orderCount: new Set(jobs.map((j) => j.orderId)).size,
            },
        });
        for (let i = 0; i < data.jobIds.length; i++) {
            await this.prisma.productionJob.update({
                where: { id: data.jobIds[i] },
                data: {
                    gangSheetBatchId: batch.id,
                    gangSheetPosition: i + 1,
                },
            });
        }
        this.logger.log(`Gang sheet batch created: ${batch.id} — ${data.sheetWidth}"×${data.sheetHeight}" — fill: ${(fillRate * 100).toFixed(1)}% — ${jobs.length} jobs`);
        return { ...batch, jobCount: jobs.length };
    }
    async getGangSheetBatches(merchantId, status) {
        return this.prisma.gangSheetBatch.findMany({
            where: {
                merchantId,
                ...(status ? { status } : {}),
            },
            include: {
                jobs: {
                    select: {
                        id: true,
                        orderId: true,
                        productType: true,
                        widthInch: true,
                        heightInch: true,
                        areaSquareInch: true,
                        gangSheetPosition: true,
                        order: { select: { shopifyOrderNumber: true } },
                    },
                    orderBy: { gangSheetPosition: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getStats(merchantId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const statusGroups = await this.prisma.productionJob.groupBy({
            by: ['status'],
            where: { merchantId },
            _count: true,
        });
        const byStatus = {};
        let totalJobs = 0;
        for (const g of statusGroups) {
            byStatus[g.status] = g._count;
            totalJobs += g._count;
        }
        const todayCompleted = await this.prisma.productionJob.count({
            where: {
                merchantId,
                status: 'COMPLETED',
                completedAt: { gte: today },
            },
        });
        const todayJobs = await this.prisma.productionJob.findMany({
            where: {
                merchantId,
                completedAt: { gte: today },
            },
            select: { areaSquareInch: true },
        });
        const todaySqft = todayJobs.reduce((sum, j) => sum + (j.areaSquareInch || 0), 0) / 144;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const completedJobs = await this.prisma.productionJob.findMany({
            where: {
                merchantId,
                status: 'COMPLETED',
                completedAt: { gte: thirtyDaysAgo },
            },
            select: { queuedAt: true, completedAt: true },
        });
        let avgTurnaroundHours = 0;
        if (completedJobs.length > 0) {
            const totalHours = completedJobs.reduce((sum, j) => {
                if (j.completedAt) {
                    return sum + (j.completedAt.getTime() - j.queuedAt.getTime()) / 3600000;
                }
                return sum;
            }, 0);
            avgTurnaroundHours = Math.round((totalHours / completedJobs.length) * 10) / 10;
        }
        const rushJobs = await this.prisma.productionJob.count({
            where: {
                merchantId,
                priority: { in: ['RUSH', 'SAME_DAY', 'NEXT_DAY'] },
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
        });
        const delayedJobs = await this.prisma.productionJob.count({
            where: {
                merchantId,
                estimatedReadyAt: { lt: new Date() },
                status: { notIn: ['COMPLETED', 'CANCELLED', 'READY', 'PICKED_UP', 'SHIPPED'] },
            },
        });
        return {
            totalJobs,
            byStatus,
            todayCompleted,
            todaySqft: Math.round(todaySqft * 100) / 100,
            avgTurnaroundHours,
            rushJobs,
            delayedJobs,
        };
    }
    async getPrinterStats(merchantId) {
        const printers = await this.prisma.printer.findMany({
            where: { merchantId },
            include: {
                jobs: {
                    where: { status: 'COMPLETED' },
                    select: { areaSquareInch: true, printStartAt: true, completedAt: true },
                },
            },
        });
        return printers.map((p) => {
            const totalSqft = p.jobs.reduce((sum, j) => sum + (j.areaSquareInch || 0), 0) / 144;
            const avgPrintTimeMin = p.jobs.length > 0
                ? p.jobs.reduce((sum, j) => {
                    if (j.printStartAt && j.completedAt) {
                        return sum + (j.completedAt.getTime() - j.printStartAt.getTime()) / 60000;
                    }
                    return sum;
                }, 0) / p.jobs.length
                : 0;
            return {
                id: p.id,
                name: p.name,
                model: p.model,
                status: p.status,
                inkLevels: {
                    cyan: p.inkCyan,
                    magenta: p.inkMagenta,
                    yellow: p.inkYellow,
                    black: p.inkBlack,
                    white: p.inkWhite,
                },
                totalJobsCompleted: p.jobs.length,
                totalSqft: Math.round(totalSqft * 100) / 100,
                avgPrintTimeMinutes: Math.round(avgPrintTimeMin * 10) / 10,
            };
        });
    }
    async recordQcResult(jobId, result, notes) {
        const job = await this.prisma.productionJob.findUnique({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException(`Job ${jobId} not found`);
        if (job.status !== 'QC_CHECK') {
            throw new common_1.BadRequestException(`Job is not in QC_CHECK status (current: ${job.status})`);
        }
        const updateData = {
            qcResult: result,
            qcNotes: notes || null,
        };
        if (result === 'pass' || result === 'conditional') {
            updateData.qcPassAt = new Date();
            updateData.status = 'PACKAGING';
            updateData.packagingStartAt = new Date();
        }
        else {
            updateData.status = 'CUTTING';
            updateData.qcStartAt = null;
        }
        return this.prisma.productionJob.update({
            where: { id: jobId },
            data: updateData,
        });
    }
    async resetDailyPrinterStats() {
        try {
            await this.prisma.printer.updateMany({
                data: {
                    totalPrintsToday: 0,
                    totalSqftToday: 0,
                },
            });
            this.logger.log('Daily printer stats reset.');
        }
        catch (err) {
            this.logger.error(`Failed to reset daily stats: ${err.message}`);
        }
    }
    parseDimensions(lineItem) {
        const title = lineItem.variant_title || lineItem.title || '';
        const match = title.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
        if (match) {
            return {
                width: parseFloat(match[1]),
                height: parseFloat(match[2]),
            };
        }
        const props = lineItem.properties || [];
        const widthProp = props.find((p) => p.name === '_width' || p.name === 'Width');
        const heightProp = props.find((p) => p.name === '_height' || p.name === 'Height');
        if (widthProp && heightProp) {
            return {
                width: parseFloat(widthProp.value),
                height: parseFloat(heightProp.value),
            };
        }
        return null;
    }
    detectProductType(lineItem) {
        const title = ((lineItem.title || '') + ' ' + (lineItem.variant_title || '')).toLowerCase();
        if (title.includes('uv dtf') || title.includes('uv-dtf'))
            return 'uv_dtf';
        if (title.includes('glitter'))
            return 'glitter';
        if (title.includes('glow'))
            return 'glow';
        if (title.includes('gang sheet') || title.includes('gang-sheet') || title.includes('gangsheet'))
            return 'gang_sheet';
        return 'dtf';
    }
    async sendProductionEvent(job, fromStatus, toStatus) {
        const userId = job.order?.companyUserId;
        if (!userId)
            return;
        const eventName = this.mapStatusToEventName(toStatus);
        if (!eventName)
            return;
        await this.dittofeedService.trackEvent(userId, eventName, {
            jobId: job.id,
            orderId: job.orderId,
            orderNumber: job.order?.shopifyOrderNumber || '',
            productType: job.productType,
            dimensions: `${job.widthInch}"×${job.heightInch}"`,
            fromStatus,
            toStatus,
            printerName: job.printer?.name || null,
        });
    }
    mapStatusToEventName(status) {
        const map = {
            PRINTING: 'production_started',
            READY: 'production_completed',
            CANCELLED: 'production_delayed',
            PICKED_UP: 'pickup_completed',
            SHIPPED: 'order_shipped',
        };
        return map[status] || null;
    }
};
exports.ProductionService = ProductionService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductionService.prototype, "resetDailyPrinterStats", null);
exports.ProductionService = ProductionService = ProductionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dittofeed_service_1.DittofeedService])
], ProductionService);
//# sourceMappingURL=production.service.js.map