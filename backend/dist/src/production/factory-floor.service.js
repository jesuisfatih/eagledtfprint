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
var FactoryFloorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactoryFloorService = void 0;
const common_1 = require("@nestjs/common");
const dittofeed_service_1 = require("../dittofeed/dittofeed.service");
const penpot_service_1 = require("../penpot/penpot.service");
const pickup_service_1 = require("../pickup/pickup.service");
const prisma_service_1 = require("../prisma/prisma.service");
const production_gateway_1 = require("./production.gateway");
const production_service_1 = require("./production.service");
const STATUS_PROGRESS = {
    QUEUED: 10,
    PREPRESS: 20,
    PRINTING: 40,
    CURING: 55,
    CUTTING: 65,
    QC_CHECK: 75,
    PACKAGING: 85,
    READY: 95,
    PICKED_UP: 100,
    SHIPPED: 100,
    COMPLETED: 100,
    CANCELLED: 0,
};
let FactoryFloorService = FactoryFloorService_1 = class FactoryFloorService {
    prisma;
    penpotService;
    pickupService;
    productionService;
    productionGateway;
    dittofeed;
    logger = new common_1.Logger(FactoryFloorService_1.name);
    constructor(prisma, penpotService, pickupService, productionService, productionGateway, dittofeed) {
        this.prisma = prisma;
        this.penpotService = penpotService;
        this.pickupService = pickupService;
        this.productionService = productionService;
        this.productionGateway = productionGateway;
        this.dittofeed = dittofeed;
    }
    async initiateFullPipeline(merchantId, orderId) {
        this.logger.log(`🏭 Initiating full pipeline for order ${orderId}`);
        const order = await this.prisma.orderLocal.findFirst({
            where: { id: orderId, merchantId },
            include: {
                company: { select: { id: true, name: true } },
                companyUser: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        const customerName = order.companyUser
            ? `${order.companyUser.firstName || ''} ${order.companyUser.lastName || ''}`.trim()
            : (order.email || 'Customer');
        const result = {
            orderId,
            orderNumber: order.shopifyOrderNumber,
            intake: null,
            design: null,
            production: null,
        };
        try {
            const pickupOrder = await this.pickupService.createPickupOrder(merchantId, {
                orderId,
                companyId: order.companyId || undefined,
                companyUserId: order.companyUserId || undefined,
                customerEmail: order.email || undefined,
                customerName,
                orderNumber: order.shopifyOrderNumber || undefined,
            });
            result.intake = {
                pickupOrderId: pickupOrder.id,
                qrCode: pickupOrder.qrCode,
                status: pickupOrder.status,
            };
            this.logger.log(`  ✓ Pickup order created: ${pickupOrder.qrCode}`);
        }
        catch (err) {
            this.logger.warn(`  ✗ Pickup order failed: ${err.message}`);
            result.intake = { error: err.message };
        }
        try {
            const designProject = await this.penpotService.createDesignProjectFromOrder(orderId, merchantId);
            result.design = designProject;
            if (designProject.success) {
                this.logger.log(`  ✓ Design project created: ${designProject.designProject?.id}`);
            }
            else {
                this.logger.warn(`  ✗ Design project: ${designProject.error}`);
            }
        }
        catch (err) {
            this.logger.warn(`  ✗ Design project failed: ${err.message}`);
            result.design = { success: false, error: err.message };
        }
        try {
            const jobs = await this.productionService.createJobsFromOrder(merchantId, orderId);
            result.production = jobs;
            this.logger.log(`  ✓ Production jobs created: ${jobs.created} jobs`);
            for (const job of jobs.jobs || []) {
                this.productionGateway.emitJobCreated(merchantId, {
                    jobId: job.id,
                    orderId: job.orderId,
                    orderNumber: job.order?.shopifyOrderNumber || '',
                    productType: job.productType,
                    priority: job.priority || 'STANDARD',
                    dimensions: `${job.widthInch}"×${job.heightInch}"`,
                });
            }
        }
        catch (err) {
            this.logger.warn(`  ✗ Production jobs failed: ${err.message}`);
            result.production = { error: err.message };
        }
        if (order.companyUserId) {
            try {
                await this.dittofeed.trackEvent(order.companyUserId, 'factory_pipeline_initiated', {
                    orderId,
                    orderNumber: order.shopifyOrderNumber || '',
                    hasDesign: result.design?.success || false,
                    productionJobs: result.production?.created || 0,
                    qrCode: result.intake?.qrCode || '',
                });
            }
            catch { }
        }
        this.logger.log(`🏭 Pipeline initiated for order ${order.shopifyOrderNumber}`);
        return result;
    }
    async scanAndProcess(qrCode) {
        const pickupOrder = await this.prisma.pickupOrder.findUnique({
            where: { qrCode },
            include: {
                order: {
                    include: {
                        company: { select: { name: true } },
                        designProjects: { select: { id: true, status: true, penpotFileId: true } },
                        productionJobs: { select: { id: true, status: true, productType: true, widthInch: true, heightInch: true } },
                    },
                },
                shelf: true,
            },
        });
        if (!pickupOrder)
            throw new common_1.NotFoundException('Invalid QR code');
        if (!pickupOrder.order)
            throw new common_1.NotFoundException('Order not found for this pickup');
        const order = pickupOrder.order;
        const merchantId = pickupOrder.merchantId;
        let designResult = null;
        if (!order.designProjects?.length) {
            try {
                designResult = await this.penpotService.createDesignProjectFromOrder(order.id, merchantId);
                this.logger.log(`QR scan → Design project created for order ${pickupOrder.orderNumber}`);
            }
            catch (err) {
                designResult = { success: false, error: err.message };
            }
        }
        else {
            designResult = {
                success: true,
                existing: true,
                designProject: order.designProjects[0],
            };
        }
        let productionResult = null;
        if (!order.productionJobs?.length) {
            try {
                productionResult = await this.productionService.createJobsFromOrder(merchantId, order.id);
                this.logger.log(`QR scan → ${productionResult.created} production jobs created`);
                for (const job of productionResult.jobs || []) {
                    this.productionGateway.emitJobCreated(merchantId, {
                        jobId: job.id,
                        orderId: job.orderId,
                        orderNumber: job.order?.shopifyOrderNumber || '',
                        productType: job.productType,
                        priority: job.priority || 'STANDARD',
                        dimensions: `${job.widthInch}"×${job.heightInch}"`,
                    });
                }
            }
            catch (err) {
                productionResult = { error: err.message };
            }
        }
        else {
            productionResult = {
                existing: true,
                count: order.productionJobs.length,
                jobs: order.productionJobs,
            };
        }
        if (pickupOrder.status === 'pending') {
            await this.pickupService.updateStatus(pickupOrder.id, merchantId, 'processing');
        }
        return {
            pickup: {
                id: pickupOrder.id,
                qrCode: pickupOrder.qrCode,
                orderNumber: pickupOrder.orderNumber,
                customerName: pickupOrder.customerName,
                status: pickupOrder.status === 'pending' ? 'processing' : pickupOrder.status,
                shelf: pickupOrder.shelf?.code || null,
            },
            design: designResult,
            production: productionResult,
            order: {
                id: order.id,
                companyName: order.company?.name || '',
            },
        };
    }
    async approveDesignAndQueue(designProjectId, merchantId) {
        const designProject = await this.penpotService.updateDesignProjectStatus(designProjectId, merchantId, 'approved');
        if (!designProject) {
            throw new common_1.NotFoundException('Design project not found');
        }
        const orderId = designProject.orderId;
        const existingJobs = await this.prisma.productionJob.findMany({
            where: { orderId, merchantId },
        });
        let jobs = existingJobs;
        if (existingJobs.length === 0) {
            const result = await this.productionService.createJobsFromOrder(merchantId, orderId);
            jobs = result.jobs;
            for (const job of result.jobs || []) {
                this.productionGateway.emitJobCreated(merchantId, {
                    jobId: job.id,
                    orderId: job.orderId,
                    orderNumber: job.order?.shopifyOrderNumber || '',
                    productType: job.productType,
                    priority: job.priority || 'STANDARD',
                    dimensions: `${job.widthInch}"×${job.heightInch}"`,
                });
            }
        }
        else {
            for (const job of existingJobs) {
                if (job.status === 'QUEUED') {
                    try {
                        await this.productionService.moveToStatus(job.id, 'PREPRESS');
                        this.productionGateway.emitJobMoved(merchantId, {
                            jobId: job.id,
                            orderId: job.orderId,
                            orderNumber: '',
                            fromStatus: 'QUEUED',
                            toStatus: 'PREPRESS',
                            productType: job.productType,
                        });
                    }
                    catch (err) {
                        this.logger.warn(`Failed to move job ${job.id} to PREPRESS: ${err.message}`);
                    }
                }
            }
        }
        return {
            designProject: { id: designProjectId, status: 'approved' },
            productionJobs: jobs.length,
            movedToPrepress: existingJobs.filter(j => j.status === 'QUEUED').length,
        };
    }
    async markOrderReady(orderId, merchantId) {
        const jobs = await this.prisma.productionJob.findMany({
            where: { orderId, merchantId },
        });
        const allReady = jobs.length > 0 && jobs.every(j => ['READY', 'PICKED_UP', 'SHIPPED', 'COMPLETED'].includes(j.status));
        if (!allReady) {
            const pending = jobs.filter(j => !['READY', 'PICKED_UP', 'SHIPPED', 'COMPLETED'].includes(j.status));
            return {
                success: false,
                message: `${pending.length} job(s) still in production`,
                pendingJobs: pending.map(j => ({ id: j.id, status: j.status })),
            };
        }
        const pickupOrder = await this.prisma.pickupOrder.findFirst({
            where: { orderId, merchantId },
        });
        if (!pickupOrder) {
            return { success: false, message: 'No pickup order found for this order' };
        }
        let assignedShelf = null;
        if (!pickupOrder.shelfId) {
            const availableShelf = await this.prisma.pickupShelf.findFirst({
                where: {
                    merchantId,
                    isActive: true,
                },
                orderBy: {
                    pickupOrders: { _count: 'asc' },
                },
            });
            if (availableShelf) {
                await this.pickupService.assignShelf(pickupOrder.id, merchantId, availableShelf.id);
                assignedShelf = availableShelf;
                this.logger.log(`  Shelf assigned: ${availableShelf.code}`);
            }
        }
        await this.pickupService.updateStatus(pickupOrder.id, merchantId, 'ready');
        const order = await this.prisma.orderLocal.findUnique({
            where: { id: orderId },
            select: { companyUserId: true, shopifyOrderNumber: true, email: true },
        });
        if (order?.companyUserId) {
            try {
                await this.dittofeed.trackEvent(order.companyUserId, 'order_ready_for_pickup', {
                    orderId,
                    orderNumber: order.shopifyOrderNumber || '',
                    qrCode: pickupOrder.qrCode,
                    shelfCode: assignedShelf?.code || pickupOrder.shelfId || 'N/A',
                    totalJobs: jobs.length,
                });
            }
            catch { }
        }
        this.productionGateway.emitQueueUpdate(merchantId, {
            queued: 0,
            printing: 0,
            ready: jobs.length,
            delayed: 0,
        });
        return {
            success: true,
            pickupOrderId: pickupOrder.id,
            qrCode: pickupOrder.qrCode,
            shelf: assignedShelf?.code || 'already assigned',
            status: 'ready',
        };
    }
    async getOrderPipelineStatus(orderId, merchantId) {
        const order = await this.prisma.orderLocal.findFirst({
            where: { id: orderId, merchantId },
            include: {
                company: { select: { name: true } },
                companyUser: { select: { email: true, firstName: true, lastName: true } },
                designProjects: {
                    select: { id: true, status: true, penpotFileId: true, designMeta: true, fileCount: true, createdAt: true, updatedAt: true },
                },
                productionJobs: {
                    include: {
                        printer: { select: { name: true } },
                    },
                    orderBy: { queuedAt: 'asc' },
                },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const pickupOrder = await this.prisma.pickupOrder.findFirst({
            where: { orderId, merchantId },
            include: { shelf: true },
        });
        const customerName = order.companyUser
            ? `${order.companyUser.firstName || ''} ${order.companyUser.lastName || ''}`.trim()
            : (order.email || 'Customer');
        const design = order.designProjects?.[0];
        const designMeta = design?.designMeta;
        const designPages = Array.isArray(designMeta?.pages) ? designMeta.pages : [];
        const prodJobs = (order.productionJobs || []).map((j) => ({
            jobId: j.id,
            status: j.status,
            productType: j.productType,
            dimensions: `${j.widthInch}"×${j.heightInch}"`,
            printer: j.printer?.name || null,
            operator: j.operatorName || null,
            progress: STATUS_PROGRESS[j.status] || 0,
        }));
        const overallProgress = prodJobs.length > 0
            ? Math.round(prodJobs.reduce((sum, j) => sum + j.progress, 0) / prodJobs.length)
            : 0;
        let currentPhase = 'INTAKE';
        if (design && design.status === 'approved' && prodJobs.length > 0) {
            const allComplete = prodJobs.every((j) => ['COMPLETED', 'PICKED_UP', 'SHIPPED'].includes(j.status));
            const allReady = prodJobs.every((j) => ['READY', 'COMPLETED', 'PICKED_UP', 'SHIPPED'].includes(j.status));
            if (allComplete)
                currentPhase = 'COMPLETED';
            else if (allReady)
                currentPhase = 'READY';
            else
                currentPhase = 'PRODUCTION';
        }
        else if (design) {
            currentPhase = 'DESIGN';
        }
        const timeline = [];
        if (pickupOrder?.createdAt) {
            timeline.push({ event: 'Pickup order created', timestamp: pickupOrder.createdAt, details: `QR: ${pickupOrder.qrCode}` });
        }
        if (design?.createdAt) {
            timeline.push({ event: 'Design project created', timestamp: design.createdAt, details: `${designPages.length} design(s)` });
        }
        for (const j of order.productionJobs || []) {
            if (j.queuedAt)
                timeline.push({ event: `Job queued: ${j.productType}`, timestamp: j.queuedAt });
            if (j.printStartAt)
                timeline.push({ event: `Printing started`, timestamp: j.printStartAt });
            if (j.completedAt)
                timeline.push({ event: `Job completed`, timestamp: j.completedAt });
        }
        if (pickupOrder?.readyAt) {
            timeline.push({ event: 'Ready for pickup', timestamp: pickupOrder.readyAt });
        }
        if (pickupOrder?.pickedUpAt) {
            timeline.push({ event: 'Picked up by customer', timestamp: pickupOrder.pickedUpAt });
        }
        timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        return {
            orderId: order.id,
            orderNumber: order.shopifyOrderNumber || '',
            customerName,
            customerEmail: order.email || '',
            companyName: order.company?.name || '',
            qrCode: pickupOrder?.qrCode || '',
            currentPhase,
            intake: {
                pickupOrderId: pickupOrder?.id || null,
                status: pickupOrder?.status || 'none',
                assignedShelf: pickupOrder?.shelf?.code || null,
                createdAt: pickupOrder?.createdAt || null,
            },
            design: {
                projectId: design?.id || null,
                penpotFileId: design?.penpotFileId || null,
                penpotUrl: design?.penpotFileId
                    ? `${this.penpotService.getPublicUrl()}/view/${design.penpotFileId}`
                    : null,
                status: design?.status || 'none',
                pageCount: designPages.length,
            },
            production: {
                jobs: prodJobs,
                overallProgress,
            },
            timeline,
        };
    }
    async getFactoryFloorDashboard(merchantId) {
        const activeOrders = await this.prisma.orderLocal.findMany({
            where: {
                merchantId,
                productionJobs: {
                    some: {
                        status: { notIn: ['COMPLETED', 'CANCELLED'] },
                    },
                },
            },
            select: {
                id: true,
                shopifyOrderNumber: true,
                email: true,
                company: { select: { name: true } },
                productionJobs: {
                    select: {
                        id: true,
                        status: true,
                        productType: true,
                        widthInch: true,
                        heightInch: true,
                        priority: true,
                        estimatedReadyAt: true,
                        queuedAt: true,
                    },
                    orderBy: { queuedAt: 'asc' },
                },
                designProjects: {
                    select: { id: true, status: true },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        const orderIds = activeOrders.map(o => o.id);
        const pickupOrders = await this.prisma.pickupOrder.findMany({
            where: { orderId: { in: orderIds }, merchantId },
            select: { orderId: true, qrCode: true, status: true, shelfId: true },
        });
        const pickupMap = new Map(pickupOrders.map((p) => [p.orderId, p]));
        const dashboard = {
            totals: {
                intake: 0,
                design: 0,
                production: 0,
                ready: 0,
            },
            orders: activeOrders.map(order => {
                const pickup = pickupMap.get(order.id);
                const design = order.designProjects?.[0];
                const jobs = order.productionJobs || [];
                const allReady = jobs.length > 0 && jobs.every(j => ['READY', 'PICKED_UP', 'SHIPPED', 'COMPLETED'].includes(j.status));
                const hasDesign = !!design;
                const hasProd = jobs.length > 0;
                let phase;
                if (allReady) {
                    phase = 'READY';
                    dashboard.totals.ready++;
                }
                else if (hasProd) {
                    phase = 'PRODUCTION';
                    dashboard.totals.production++;
                }
                else if (hasDesign) {
                    phase = 'DESIGN';
                    dashboard.totals.design++;
                }
                else {
                    phase = 'INTAKE';
                    dashboard.totals.intake++;
                }
                const progress = jobs.length > 0
                    ? Math.round(jobs.reduce((s, j) => s + (STATUS_PROGRESS[j.status] || 0), 0) / jobs.length)
                    : 0;
                return {
                    orderId: order.id,
                    orderNumber: order.shopifyOrderNumber || '',
                    company: order.company?.name || '',
                    email: order.email || '',
                    phase,
                    qrCode: pickup?.qrCode || '',
                    designStatus: design?.status || 'none',
                    jobCount: jobs.length,
                    rushPriority: jobs.some(j => ['RUSH', 'SAME_DAY', 'NEXT_DAY'].includes(j.priority)),
                    progress,
                    isOverdue: jobs.some(j => j.estimatedReadyAt && new Date() > j.estimatedReadyAt),
                    oldestJobAge: jobs.length > 0 && jobs[0].queuedAt
                        ? Math.round((Date.now() - jobs[0].queuedAt.getTime()) / 60000)
                        : 0,
                };
            }),
        };
        return dashboard;
    }
    async getDailySummary(merchantId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [ordersCreatedToday, jobsCompletedToday, designsCreatedToday, pickupsCompletedToday, activeJobs, readyForPickup,] = await Promise.all([
            this.prisma.orderLocal.count({
                where: { merchantId, createdAt: { gte: today } },
            }),
            this.prisma.productionJob.count({
                where: { merchantId, completedAt: { gte: today } },
            }),
            this.prisma.designProject.count({
                where: { merchantId, createdAt: { gte: today } },
            }),
            this.prisma.pickupOrder.count({
                where: { merchantId, pickedUpAt: { gte: today } },
            }),
            this.prisma.productionJob.count({
                where: { merchantId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            }),
            this.prisma.pickupOrder.count({
                where: { merchantId, status: { in: ['ready', 'notified'] } },
            }),
        ]);
        const completedJobsToday = await this.prisma.productionJob.findMany({
            where: { merchantId, completedAt: { gte: today } },
            select: { areaSquareInch: true },
        });
        const sqftToday = completedJobsToday.reduce((sum, j) => sum + (j.areaSquareInch || 0), 0) / 144;
        return {
            date: today.toISOString().split('T')[0],
            ordersCreated: ordersCreatedToday,
            jobsCompleted: jobsCompletedToday,
            designsCreated: designsCreatedToday,
            pickupsCompleted: pickupsCompletedToday,
            sqftPrinted: Math.round(sqftToday * 100) / 100,
            activeInPipeline: activeJobs,
            readyForPickup,
        };
    }
};
exports.FactoryFloorService = FactoryFloorService;
exports.FactoryFloorService = FactoryFloorService = FactoryFloorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        penpot_service_1.PenpotService,
        pickup_service_1.PickupService,
        production_service_1.ProductionService,
        production_gateway_1.ProductionGateway,
        dittofeed_service_1.DittofeedService])
], FactoryFloorService);
//# sourceMappingURL=factory-floor.service.js.map