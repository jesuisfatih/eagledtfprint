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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PenpotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PenpotService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const dittofeed_service_1 = require("../dittofeed/dittofeed.service");
const prisma_service_1 = require("../prisma/prisma.service");
const production_service_1 = require("../production/production.service");
let PenpotService = PenpotService_1 = class PenpotService {
    prisma;
    dittofeed;
    production;
    logger = new common_1.Logger(PenpotService_1.name);
    client = null;
    initialized = false;
    constructor(prisma, dittofeed, production) {
        this.prisma = prisma;
        this.dittofeed = dittofeed;
        this.production = production;
    }
    async onModuleInit() {
        const host = process.env.PENPOT_BACKEND_URL || 'http://multiservice-penpot-backend:6060';
        const email = process.env.PENPOT_API_EMAIL;
        const password = process.env.PENPOT_API_PASSWORD;
        if (!email || !password) {
            this.logger.warn('PENPOT_API_EMAIL / PENPOT_API_PASSWORD not set — Penpot integration disabled');
            return;
        }
        try {
            const loginRes = await axios_1.default.post(`${host}/api/rpc/command/login-with-password`, {
                email,
                password,
            });
            const authToken = loginRes.data?.['auth-token'] || loginRes.headers['set-cookie']?.[0]?.split('=')?.[1]?.split(';')?.[0];
            if (!authToken) {
                this.logger.error(`Failed to extract auth token from Penpot login response. Data: ${JSON.stringify(loginRes.data)}`);
                return;
            }
            this.client = axios_1.default.create({
                baseURL: host,
                headers: {
                    'Authorization': `Token ${authToken}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            });
            this.initialized = true;
            this.logger.log(`Penpot API client initialized → ${host}`);
        }
        catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
            this.logger.error(`Failed to init Penpot API client [${status}]: ${err.message}. Data: ${JSON.stringify(data)}`);
        }
    }
    isReady() {
        return this.initialized && this.client !== null;
    }
    getPublicUrl() {
        return process.env.PENPOT_PUBLIC_URL || 'https://design.techifyboost.com';
    }
    async getPublicDesignProject(id) {
        const project = await this.prisma.designProject.findUnique({
            where: { id },
            include: {
                merchant: { select: { name: true } },
            },
        });
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        return {
            id: project.id,
            title: project.title,
            status: project.status,
            merchantName: project.merchant?.name,
            viewUrl: project.penpotFileId ? `${this.getPublicUrl()}/view/${project.penpotFileId}` : null,
            fileCount: project.fileCount,
        };
    }
    async createDesignProjectFromOrder(orderId, merchantId) {
        if (!this.isReady())
            return { success: false, error: 'Penpot not initialized' };
        const order = await this.prisma.orderLocal.findFirst({
            where: { id: orderId, merchantId },
            include: {
                company: { select: { id: true, name: true } },
                companyUser: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
        });
        if (!order) {
            return { success: false, error: 'Order not found' };
        }
        const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
        const designFiles = this.extractDesignFilesWithDimensions(lineItems);
        if (designFiles.length === 0) {
            return { success: false, error: 'No design files found in this order' };
        }
        try {
            const teamId = await this.getOrCreateTeam(merchantId);
            const projectName = `Order #${order.shopifyOrderNumber || order.shopifyOrderId} — ${order.company?.name || 'Customer'}`;
            const project = await this.createProject(teamId, projectName);
            const file = await this.createFile(project.id, projectName);
            const pages = [];
            for (let i = 0; i < designFiles.length; i++) {
                const designFile = designFiles[i];
                const pageName = `${designFile.lineItemTitle || `Item ${i + 1}`} — ${designFile.variantTitle || 'Default'}`;
                const page = await this.createPage(file.id, pageName, {
                    width: designFile.dimensions.widthPx,
                    height: designFile.dimensions.heightPx,
                });
                pages.push({
                    pageId: page.id,
                    pageName,
                    designFile,
                });
            }
            const designProject = await this.prisma.designProject.create({
                data: {
                    merchantId,
                    orderId: order.id,
                    companyId: order.companyId,
                    companyUserId: order.companyUserId,
                    penpotProjectId: project.id,
                    penpotFileId: file.id,
                    title: projectName,
                    status: 'draft',
                    fileCount: designFiles.length,
                    designMeta: {
                        pages: pages.map(p => ({
                            pageId: p.pageId,
                            pageName: p.pageName,
                            lineItemTitle: p.designFile.lineItemTitle,
                            variantTitle: p.designFile.variantTitle,
                            dimensions: p.designFile.dimensions,
                            sourceUrl: p.designFile.uploadedFileUrl || p.designFile.previewUrl,
                            printReadyUrl: p.designFile.printReadyUrl,
                        })),
                    },
                },
            });
            if (order.companyUserId) {
                await this.dittofeed.trackDesignEvent(order.companyUserId, 'Design Project Created', {
                    orderId: order.id,
                    orderNumber: order.shopifyOrderNumber,
                    designProjectId: designProject.id,
                    fileCount: designFiles.length,
                });
            }
            const viewUrl = `${this.getPublicUrl()}/view/${file.id}`;
            return {
                success: true,
                designProject: {
                    id: designProject.id,
                    penpotProjectId: project.id,
                    penpotFileId: file.id,
                    viewUrl,
                    pages: pages.map(p => ({
                        pageId: p.pageId,
                        pageName: p.pageName,
                        dimensions: p.designFile.dimensions,
                    })),
                },
            };
        }
        catch (err) {
            this.logger.error(`Failed to create design project for order ${orderId}: ${err.message}`);
            return { success: false, error: err.message };
        }
    }
    extractDesignFilesWithDimensions(lineItems) {
        if (!Array.isArray(lineItems))
            return [];
        const files = [];
        for (const item of lineItems) {
            const properties = item.properties || [];
            if (!Array.isArray(properties) || properties.length === 0)
                continue;
            const fileInfo = {
                lineItemTitle: item.title || item.name,
                variantTitle: item.variant_title,
                quantity: item.quantity,
                price: item.price,
                shopifyVariantId: item.variant_id,
                shopifyProductId: item.product_id,
                imageUrl: item.image_url || null,
            };
            for (const prop of properties) {
                const name = (prop.name || '').toLowerCase();
                const value = prop.value || '';
                if (name.startsWith('_') && !name.includes('preview') && !name.includes('upload') && !name.includes('thumbnail') && !name.includes('width') && !name.includes('height'))
                    continue;
                if (name.includes('preview') || name === '_preview')
                    fileInfo.previewUrl = value;
                if (name.includes('print') && name.includes('ready'))
                    fileInfo.printReadyUrl = value;
                if ((name.includes('uploaded') || name.includes('file_url') || name.includes('file url')) && this.isUrl(value))
                    fileInfo.uploadedFileUrl = value;
                if (name.includes('thumbnail') || name === '_ul_thumbnail')
                    fileInfo.thumbnailUrl = value;
                if (name.includes('edit') && !name.includes('admin'))
                    fileInfo.editUrl = value;
                if (name.includes('width') && !name.includes('screen'))
                    fileInfo.rawWidth = value;
                if (name.includes('height') && !name.includes('screen'))
                    fileInfo.rawHeight = value;
                if (name === 'dpi' || name === '_dpi')
                    fileInfo.dpi = parseInt(value) || 300;
                if (name === 'unit' || name === '_unit')
                    fileInfo.unit = value;
                if (!fileInfo.uploadedFileUrl && this.isUrl(value) && (name.includes('image') || name.includes('file') || name.includes('artwork') ||
                    name.includes('design') || name.includes('photo') || name.includes('logo'))) {
                    fileInfo.uploadedFileUrl = value;
                }
            }
            if (!fileInfo.previewUrl && !fileInfo.printReadyUrl && !fileInfo.uploadedFileUrl && !fileInfo.thumbnailUrl)
                continue;
            fileInfo.dimensions = this.parseDimensions(item.variant_title, fileInfo.rawWidth, fileInfo.rawHeight, fileInfo.unit, fileInfo.dpi, item.options || []);
            fileInfo.allProperties = properties.filter((p) => !(p.name || '').startsWith('_') || (p.name || '').includes('preview') || (p.name || '').includes('upload') || (p.name || '').includes('width') || (p.name || '').includes('height'));
            files.push(fileInfo);
        }
        return files;
    }
    parseDimensions(variantTitle, rawWidth, rawHeight, unit, dpi, options) {
        const targetDpi = dpi || 300;
        const targetUnit = unit || 'inch';
        if (rawWidth && rawHeight) {
            const w = parseFloat(rawWidth);
            const h = parseFloat(rawHeight);
            if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
                const wInch = targetUnit === 'cm' ? w / 2.54 : w;
                const hInch = targetUnit === 'cm' ? h / 2.54 : h;
                return {
                    widthInch: wInch,
                    heightInch: hInch,
                    widthPx: Math.round(wInch * targetDpi),
                    heightPx: Math.round(hInch * targetDpi),
                    unit: targetUnit,
                    dpi: targetDpi,
                    source: 'properties',
                };
            }
        }
        if (variantTitle) {
            const sizeMatch = variantTitle.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
            if (sizeMatch) {
                const w = parseFloat(sizeMatch[1]);
                const h = parseFloat(sizeMatch[2]);
                if (w > 0 && h > 0) {
                    return {
                        widthInch: w,
                        heightInch: h,
                        widthPx: Math.round(w * targetDpi),
                        heightPx: Math.round(h * targetDpi),
                        unit: 'inch',
                        dpi: targetDpi,
                        source: 'variant_title',
                    };
                }
            }
        }
        if (Array.isArray(options)) {
            for (const opt of options) {
                const name = (opt.name || '').toLowerCase();
                const value = opt.value || '';
                if (name.includes('size') || name.includes('boyut')) {
                    const match = value.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
                    if (match) {
                        const w = parseFloat(match[1]);
                        const h = parseFloat(match[2]);
                        if (w > 0 && h > 0) {
                            return {
                                widthInch: w,
                                heightInch: h,
                                widthPx: Math.round(w * targetDpi),
                                heightPx: Math.round(h * targetDpi),
                                unit: 'inch',
                                dpi: targetDpi,
                                source: 'product_option',
                            };
                        }
                    }
                }
            }
        }
        return {
            widthInch: 11,
            heightInch: 17,
            widthPx: 3300,
            heightPx: 5100,
            unit: 'inch',
            dpi: targetDpi,
            source: 'default',
        };
    }
    isUrl(value) {
        if (!value || typeof value !== 'string')
            return false;
        return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//');
    }
    async getOrCreateTeam(merchantId) {
        if (!this.client)
            throw new Error('Penpot not initialized');
        const existing = await this.prisma.marketingSync.findFirst({
            where: { merchantId, entityType: 'penpot_team' },
        });
        if (existing?.dittofeedUserId) {
            return existing.dittofeedUserId;
        }
        const teamsRes = await this.client.post('/api/rpc/command/get-teams', {});
        const teams = teamsRes.data || [];
        const teamId = teams.length > 0 ? teams[0].id : null;
        if (!teamId) {
            throw new Error('No Penpot team found');
        }
        await this.prisma.marketingSync.create({
            data: {
                merchantId,
                entityType: 'penpot_team',
                entityId: merchantId,
                dittofeedUserId: teamId,
                syncStatus: 'synced',
                lastSyncedAt: new Date(),
            },
        });
        return teamId;
    }
    async createProject(teamId, name) {
        if (!this.client)
            throw new Error('Penpot not initialized');
        const res = await this.client.post('/api/rpc/command/create-project', {
            'team-id': teamId,
            name,
        });
        return { id: res.data.id };
    }
    async createFile(projectId, name) {
        if (!this.client)
            throw new Error('Penpot not initialized');
        const res = await this.client.post('/api/rpc/command/create-file', {
            'project-id': projectId,
            name,
        });
        return { id: res.data.id };
    }
    async createPage(fileId, name, dimensions) {
        if (!this.client)
            throw new Error('Penpot not initialized');
        const res = await this.client.post('/api/rpc/command/create-page', {
            'file-id': fileId,
            name,
            width: dimensions.width,
            height: dimensions.height,
        });
        return { id: res.data?.id || 'default' };
    }
    async getDesignProjectsForOrder(orderId, merchantId) {
        const projects = await this.prisma.designProject.findMany({
            where: { orderId, merchantId },
            orderBy: { createdAt: 'desc' },
        });
        return projects.map(p => ({
            ...p,
            viewUrl: p.penpotFileId ? `${this.getPublicUrl()}/view/${p.penpotFileId}` : null,
            editUrl: p.penpotFileId ? `${this.getPublicUrl()}/workspace/${p.penpotProjectId}/${p.penpotFileId}` : null,
        }));
    }
    async getAllDesignProjects(merchantId, filters) {
        const where = { merchantId };
        if (filters?.status)
            where.status = filters.status;
        if (filters?.companyId)
            where.companyId = filters.companyId;
        const projects = await this.prisma.designProject.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return projects.map(p => ({
            ...p,
            viewUrl: p.penpotFileId ? `${this.getPublicUrl()}/view/${p.penpotFileId}` : null,
            editUrl: p.penpotFileId ? `${this.getPublicUrl()}/workspace/${p.penpotProjectId}/${p.penpotFileId}` : null,
        }));
    }
    async updateDesignProjectStatus(id, merchantId, status) {
        const existing = await this.prisma.designProject.findUnique({
            where: { id },
            select: { id: true, merchantId: true, orderId: true, companyUserId: true }
        });
        if (!existing)
            throw new common_1.NotFoundException('Design project not found');
        const effectiveMerchantId = merchantId || existing.merchantId;
        const project = await this.prisma.designProject.update({
            where: { id },
            data: { status },
        });
        if (project.companyUserId) {
            const eventName = (status === 'DESIGN_READY' || status === 'design_ready')
                ? 'design_waiting_approval'
                : (status === 'APPROVED' || status === 'approved')
                    ? 'design_approved'
                    : (status === 'REJECTED' || status === 'rejected')
                        ? 'design_rejected'
                        : 'Design Status Changed';
            await this.dittofeed.trackDesignEvent(project.companyUserId, eventName, {
                designProjectId: project.id,
                orderId: project.orderId,
                status,
                metadata: {
                    approvalUrl: `https://app.eagledtfsupply.com/design-approval/${project.id}`,
                }
            });
        }
        if (status === 'APPROVED' || status === 'approved') {
            try {
                await this.production.createJobsFromOrder(effectiveMerchantId, project.orderId);
                await this.exportDesign(project.id, effectiveMerchantId, 'pdf');
                this.logger.log(`Automated export triggered for APPROVED project ${project.id}`);
            }
            catch (err) {
                this.logger.error(`Failed to trigger production/export for order ${project.orderId}: ${err.message}`);
            }
        }
        return project;
    }
    async syncDesignReady(merchantId, penpotFileId) {
        const project = await this.prisma.designProject.findFirst({
            where: { penpotFileId, merchantId },
        });
        if (!project) {
            throw new common_1.NotFoundException(`Design project for Penpot File ${penpotFileId} not found`);
        }
        const updated = await this.updateDesignProjectStatus(project.id, merchantId, 'DESIGN_READY');
        this.logger.log(`Design marked as READY via sync: Project ${project.id} (File ${penpotFileId})`);
        return updated;
    }
    async exportDesign(designProjectId, merchantId, format = 'pdf') {
        if (!this.isReady())
            return { success: false, error: 'Penpot not initialized' };
        const project = await this.prisma.designProject.findFirst({
            where: { id: designProjectId, merchantId },
        });
        if (!project || !project.penpotFileId) {
            return { success: false, error: 'Design project not found' };
        }
        try {
            const exporterUrl = process.env.PENPOT_EXPORTER_URL || 'http://multiservice-penpot-exporter:6061';
            const res = await axios_1.default.post(`${exporterUrl}/export`, {
                'file-id': project.penpotFileId,
                type: format,
            }, {
                responseType: 'arraybuffer',
                timeout: 30000,
            });
            await this.prisma.designProject.update({
                where: { id: designProjectId },
                data: {
                    exportFormat: format,
                    exportedAt: new Date(),
                    status: 'exported',
                },
            });
            if (project.companyUserId) {
                await this.dittofeed.trackDesignEvent(project.companyUserId, 'Design Exported', {
                    designProjectId: project.id,
                    orderId: project.orderId,
                    format,
                });
            }
            return {
                success: true,
                data: res.data,
                contentType: format === 'pdf' ? 'application/pdf' : format === 'svg' ? 'image/svg+xml' : 'image/png',
            };
        }
        catch (err) {
            this.logger.error(`Failed to export design ${designProjectId}: ${err.message}`);
            return { success: false, error: err.message };
        }
    }
    async requestRevision(id, merchantId, notes) {
        const project = await this.updateDesignProjectStatus(id, merchantId, 'REVISION_REQUESTED');
        if (project.companyUserId) {
            await this.dittofeed.trackDesignEvent(project.companyUserId, 'Design Revision Requested', {
                designProjectId: project.id,
                orderId: project.orderId,
                status: 'REVISION_REQUESTED',
                metadata: {
                    revisionNotes: notes,
                    uploadUrl: `https://app.eagledtfsupply.com/order/${project.orderId}/upload`,
                }
            });
        }
        this.logger.log(`Revision requested for project ${project.id}: ${notes}`);
        return project;
    }
};
exports.PenpotService = PenpotService;
exports.PenpotService = PenpotService = PenpotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => production_service_1.ProductionService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dittofeed_service_1.DittofeedService,
        production_service_1.ProductionService])
], PenpotService);
//# sourceMappingURL=penpot.service.js.map