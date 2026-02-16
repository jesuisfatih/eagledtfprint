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
var PickupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PickupService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let PickupService = PickupService_1 = class PickupService {
    prisma;
    logger = new common_1.Logger(PickupService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createShelf(merchantId, data) {
        return this.prisma.pickupShelf.create({
            data: { merchantId, code: data.code, name: data.name, description: data.description },
        });
    }
    async getShelves(merchantId) {
        return this.prisma.pickupShelf.findMany({
            where: { merchantId },
            include: { _count: { select: { pickupOrders: true } } },
            orderBy: { code: 'asc' },
        });
    }
    async updateShelf(id, merchantId, data) {
        const shelf = await this.prisma.pickupShelf.findFirst({ where: { id, merchantId } });
        if (!shelf)
            throw new common_1.NotFoundException('Shelf not found');
        return this.prisma.pickupShelf.update({ where: { id }, data });
    }
    async deleteShelf(id, merchantId) {
        const shelf = await this.prisma.pickupShelf.findFirst({ where: { id, merchantId } });
        if (!shelf)
            throw new common_1.NotFoundException('Shelf not found');
        const activeOrders = await this.prisma.pickupOrder.count({
            where: { shelfId: id, status: { notIn: ['completed', 'picked_up'] } },
        });
        if (activeOrders > 0)
            throw new common_1.BadRequestException('Shelf has active orders. Move them first.');
        return this.prisma.pickupShelf.delete({ where: { id } });
    }
    generateQrCode() {
        return `PU-${(0, crypto_1.randomBytes)(6).toString('hex').toUpperCase()}`;
    }
    parseDesignFiles(orderData) {
        const files = [];
        const lineItems = orderData.line_items || orderData.lineItems || [];
        for (const item of lineItems) {
            const properties = item.properties || [];
            const fileInfo = {
                lineItemTitle: item.title || item.name,
                variantTitle: item.variant_title,
                quantity: item.quantity,
                price: item.price,
            };
            for (const prop of properties) {
                const name = prop.name?.toLowerCase?.() || '';
                if (name.includes('preview') || name === '_preview')
                    fileInfo.previewUrl = prop.value;
                if (name.includes('edit') && !name.includes('admin'))
                    fileInfo.editUrl = prop.value;
                if (name.includes('admin') && name.includes('edit'))
                    fileInfo.adminEditUrl = prop.value;
                if (name.includes('print') && name.includes('ready'))
                    fileInfo.printReadyUrl = prop.value;
                if (name.includes('uploaded') || name.includes('file_url'))
                    fileInfo.uploadedFileUrl = prop.value;
                if (name.includes('upload_id') || name === '_ul_upload_id')
                    fileInfo.uploadId = prop.value;
                if (name.includes('thumbnail') || name === '_ul_thumbnail')
                    fileInfo.thumbnailUrl = prop.value;
                if (name.includes('design_type') || name === 'design type')
                    fileInfo.designType = prop.value;
                if (name.includes('file_name') || name === 'file name')
                    fileInfo.fileName = prop.value;
            }
            if (fileInfo.previewUrl || fileInfo.printReadyUrl || fileInfo.uploadedFileUrl || fileInfo.editUrl) {
                files.push(fileInfo);
            }
        }
        return files;
    }
    async createPickupOrder(merchantId, data) {
        const existing = await this.prisma.pickupOrder.findFirst({
            where: { orderId: data.orderId, merchantId },
        });
        if (existing)
            return existing;
        const qrCode = this.generateQrCode();
        return this.prisma.pickupOrder.create({
            data: {
                merchantId,
                orderId: data.orderId,
                companyId: data.companyId,
                companyUserId: data.companyUserId,
                customerEmail: data.customerEmail,
                customerName: data.customerName,
                orderNumber: data.orderNumber,
                designFiles: data.designFiles || [],
                qrCode,
                notes: data.notes,
            },
            include: { order: true, shelf: true, company: true },
        });
    }
    async createFromWebhookOrder(merchantId, orderLocal, rawOrderData) {
        const shippingLines = rawOrderData.shipping_lines || [];
        const isPickup = shippingLines.some((sl) => (sl.title || '').toLowerCase().includes('pickup') ||
            (sl.code || '').toLowerCase().includes('pickup'));
        const fulfillmentType = rawOrderData.fulfillment_type || '';
        const hasPickupTag = isPickup || fulfillmentType === 'pickup';
        if (!hasPickupTag) {
            this.logger.debug(`Order ${rawOrderData.order_number} is not a pickup order, skipping.`);
            return null;
        }
        const designFiles = this.parseDesignFiles(rawOrderData);
        const customerName = rawOrderData.customer
            ? `${rawOrderData.customer.first_name || ''} ${rawOrderData.customer.last_name || ''}`.trim()
            : '';
        return this.createPickupOrder(merchantId, {
            orderId: orderLocal.id,
            companyId: orderLocal.companyId,
            companyUserId: orderLocal.companyUserId,
            customerEmail: rawOrderData.email,
            customerName,
            orderNumber: rawOrderData.order_number?.toString(),
            designFiles,
        });
    }
    async getPickupOrders(merchantId, filters = {}) {
        const where = { merchantId };
        if (filters.status)
            where.status = filters.status;
        if (filters.companyId)
            where.companyId = filters.companyId;
        if (filters.shelfId)
            where.shelfId = filters.shelfId;
        if (filters.search) {
            where.OR = [
                { orderNumber: { contains: filters.search, mode: 'insensitive' } },
                { customerEmail: { contains: filters.search, mode: 'insensitive' } },
                { customerName: { contains: filters.search, mode: 'insensitive' } },
                { qrCode: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.pickupOrder.findMany({
            where,
            include: { order: true, shelf: true, company: true, companyUser: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPickupOrder(id, merchantId) {
        const order = await this.prisma.pickupOrder.findFirst({
            where: { id, merchantId },
            include: { order: true, shelf: true, company: true, companyUser: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Pickup order not found');
        return order;
    }
    async assignShelf(id, merchantId, shelfId) {
        const pickupOrder = await this.prisma.pickupOrder.findFirst({ where: { id, merchantId } });
        if (!pickupOrder)
            throw new common_1.NotFoundException('Pickup order not found');
        const shelf = await this.prisma.pickupShelf.findFirst({ where: { id: shelfId, merchantId } });
        if (!shelf)
            throw new common_1.NotFoundException('Shelf not found');
        return this.prisma.pickupOrder.update({
            where: { id },
            data: { shelfId, assignedAt: new Date() },
            include: { shelf: true, order: true },
        });
    }
    async updateStatus(id, merchantId, status) {
        const pickupOrder = await this.prisma.pickupOrder.findFirst({ where: { id, merchantId } });
        if (!pickupOrder)
            throw new common_1.NotFoundException('Pickup order not found');
        const validStatuses = ['pending', 'processing', 'ready', 'notified', 'picked_up', 'completed'];
        if (!validStatuses.includes(status)) {
            throw new common_1.BadRequestException(`Invalid status. Valid: ${validStatuses.join(', ')}`);
        }
        const data = { status };
        if (status === 'ready')
            data.readyAt = new Date();
        if (status === 'notified')
            data.notifiedAt = new Date();
        if (status === 'picked_up')
            data.pickedUpAt = new Date();
        return this.prisma.pickupOrder.update({
            where: { id },
            data,
            include: { shelf: true, order: true },
        });
    }
    async scanQrCode(qrCode) {
        const pickupOrder = await this.prisma.pickupOrder.findUnique({
            where: { qrCode },
            include: {
                shelf: true,
                order: { select: { shopifyOrderNumber: true, totalPrice: true, lineItems: true } },
            },
        });
        if (!pickupOrder)
            throw new common_1.NotFoundException('Invalid QR code');
        return {
            orderNumber: pickupOrder.orderNumber,
            shelf: pickupOrder.shelf ? {
                code: pickupOrder.shelf.code,
                name: pickupOrder.shelf.name,
                description: pickupOrder.shelf.description,
            } : null,
            status: pickupOrder.status,
            customerName: pickupOrder.customerName,
        };
    }
    async verifyCustomerEmail(email) {
        const orders = await this.prisma.pickupOrder.findMany({
            where: {
                customerEmail: { equals: email, mode: 'insensitive' },
                status: { in: ['ready', 'notified'] },
            },
            include: { shelf: true },
            orderBy: { createdAt: 'desc' },
        });
        return orders.map(o => ({
            orderNumber: o.orderNumber,
            qrCode: o.qrCode,
            status: o.status,
            shelf: o.shelf ? { code: o.shelf.code, name: o.shelf.name } : null,
        }));
    }
    async getStats(merchantId) {
        const [pending, processing, ready, pickedUp, totalShelves] = await Promise.all([
            this.prisma.pickupOrder.count({ where: { merchantId, status: 'pending' } }),
            this.prisma.pickupOrder.count({ where: { merchantId, status: 'processing' } }),
            this.prisma.pickupOrder.count({ where: { merchantId, status: { in: ['ready', 'notified'] } } }),
            this.prisma.pickupOrder.count({ where: { merchantId, status: 'picked_up' } }),
            this.prisma.pickupShelf.count({ where: { merchantId, isActive: true } }),
        ]);
        return { pending, processing, ready, pickedUp, totalShelves };
    }
};
exports.PickupService = PickupService;
exports.PickupService = PickupService = PickupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PickupService);
//# sourceMappingURL=pickup.service.js.map