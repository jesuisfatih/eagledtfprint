import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PickupService {
  private readonly logger = new Logger(PickupService.name);

  constructor(
    private prisma: PrismaService,
    private dittofeed: DittofeedService,
  ) {}

  // =========================================
  // SHELVES CRUD
  // =========================================

  async createShelf(merchantId: string, data: { code: string; name?: string; description?: string }) {
    return this.prisma.pickupShelf.create({
      data: { merchantId, code: data.code, name: data.name, description: data.description },
    });
  }

  async getShelves(merchantId: string) {
    return this.prisma.pickupShelf.findMany({
      where: { merchantId },
      include: { _count: { select: { pickupOrders: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async updateShelf(id: string, merchantId: string, data: Partial<{ code: string; name: string; description: string; isActive: boolean }>) {
    const shelf = await this.prisma.pickupShelf.findFirst({ where: { id, merchantId } });
    if (!shelf) throw new NotFoundException('Shelf not found');
    return this.prisma.pickupShelf.update({ where: { id }, data });
  }

  async deleteShelf(id: string, merchantId: string) {
    const shelf = await this.prisma.pickupShelf.findFirst({ where: { id, merchantId } });
    if (!shelf) throw new NotFoundException('Shelf not found');
    // Check if shelf has active orders
    const activeOrders = await this.prisma.pickupOrder.count({
      where: { shelfId: id, status: { notIn: ['completed', 'picked_up'] } },
    });
    if (activeOrders > 0) throw new BadRequestException('Shelf has active orders. Move them first.');
    return this.prisma.pickupShelf.delete({ where: { id } });
  }

  // =========================================
  // PICKUP ORDERS
  // =========================================

  private generateQrCode(): string {
    return `PU-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  /**
   * Shopify sipariş notlarından DripApps/CustomizerApp dosya bilgilerini parse eder
   */
  parseDesignFiles(orderData: any): any[] {
    const files: any[] = [];
    const lineItems = orderData.line_items || orderData.lineItems || [];

    for (const item of lineItems) {
      const properties = item.properties || [];
      const fileInfo: any = {
        lineItemTitle: item.title || item.name,
        variantTitle: item.variant_title,
        quantity: item.quantity,
        price: item.price,
      };

      for (const prop of properties) {
        const name = prop.name?.toLowerCase?.() || '';
        if (name.includes('preview') || name === '_preview') fileInfo.previewUrl = prop.value;
        if (name.includes('edit') && !name.includes('admin')) fileInfo.editUrl = prop.value;
        if (name.includes('admin') && name.includes('edit')) fileInfo.adminEditUrl = prop.value;
        if (name.includes('print') && name.includes('ready')) fileInfo.printReadyUrl = prop.value;
        if (name.includes('uploaded') || name.includes('file_url')) fileInfo.uploadedFileUrl = prop.value;
        if (name.includes('upload_id') || name === '_ul_upload_id') fileInfo.uploadId = prop.value;
        if (name.includes('thumbnail') || name === '_ul_thumbnail') fileInfo.thumbnailUrl = prop.value;
        if (name.includes('design_type') || name === 'design type') fileInfo.designType = prop.value;
        if (name.includes('file_name') || name === 'file name') fileInfo.fileName = prop.value;
      }

      // Sadece dosya bilgisi olan satırları ekle
      if (fileInfo.previewUrl || fileInfo.printReadyUrl || fileInfo.uploadedFileUrl || fileInfo.editUrl) {
        files.push(fileInfo);
      }
    }

    return files;
  }

  async createPickupOrder(merchantId: string, data: {
    orderId: string;
    companyId?: string;
    companyUserId?: string;
    customerEmail?: string;
    customerName?: string;
    orderNumber?: string;
    designFiles?: any;
    notes?: string;
  }) {
    // Check if pickup order already exists for this order
    const existing = await this.prisma.pickupOrder.findFirst({
      where: { orderId: data.orderId, merchantId },
    });
    if (existing) return existing;

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

  /**
   * Shopify webhook'tan gelen sipariş ile otomatik pickup order oluştur
   */
  async createFromWebhookOrder(merchantId: string, orderLocal: any, rawOrderData: any) {
    // Sadece pickup siparişleri için (shipping method check)
    const shippingLines = rawOrderData.shipping_lines || [];
    const isPickup = shippingLines.some((sl: any) =>
      (sl.title || '').toLowerCase().includes('pickup') ||
      (sl.code || '').toLowerCase().includes('pickup')
    );

    // Fulfillment type check
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

  async getPickupOrders(merchantId: string, filters: {
    status?: string;
    companyId?: string;
    shelfId?: string;
    search?: string;
  } = {}) {
    const where: any = { merchantId };
    if (filters.status) where.status = filters.status;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.shelfId) where.shelfId = filters.shelfId;
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

  async getPickupOrder(id: string, merchantId: string) {
    const order = await this.prisma.pickupOrder.findFirst({
      where: { id, merchantId },
      include: { order: true, shelf: true, company: true, companyUser: true },
    });
    if (!order) throw new NotFoundException('Pickup order not found');
    return order;
  }

  async assignShelf(id: string, merchantId: string, shelfId: string) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({ where: { id, merchantId } });
    if (!pickupOrder) throw new NotFoundException('Pickup order not found');

    const shelf = await this.prisma.pickupShelf.findFirst({ where: { id: shelfId, merchantId } });
    if (!shelf) throw new NotFoundException('Shelf not found');

    const updated = await this.prisma.pickupOrder.update({
      where: { id },
      data: { shelfId, assignedAt: new Date() },
      include: { shelf: true, order: true },
    });

    if (updated.companyUserId) {
      await this.dittofeed.trackEvent(updated.companyUserId, 'pickup_shelf_assigned', {
        pickupOrderId: updated.id,
        orderNumber: updated.orderNumber,
        shelfCode: shelf.code,
      });
    }

    return updated;
  }

  async updateStatus(id: string, merchantId: string, status: string) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({ where: { id, merchantId } });
    if (!pickupOrder) throw new NotFoundException('Pickup order not found');

    const validStatuses = ['pending', 'processing', 'ready', 'notified', 'picked_up', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Valid: ${validStatuses.join(', ')}`);
    }

    const data: any = { status };
    if (status === 'ready') data.readyAt = new Date();
    if (status === 'notified') data.notifiedAt = new Date();
    if (status === 'picked_up') data.pickedUpAt = new Date();

    const updated = await this.prisma.pickupOrder.update({
      where: { id },
      data,
      include: { shelf: true, order: true },
    });

    if (updated.companyUserId) {
      const eventName = `pickup_${status}`;
      await this.dittofeed.trackEvent(updated.companyUserId, eventName, {
        pickupOrderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        shelfCode: updated.shelf?.code || null,
        qrCode: updated.qrCode,
      });
    }

    return updated;
  }

  // =========================================
  // QR SCAN / KIOSK
  // =========================================

  async scanQrCode(qrCode: string) {
    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { qrCode },
      include: {
        shelf: true,
        order: { select: { shopifyOrderNumber: true, totalPrice: true, lineItems: true } },
      },
    });

    if (!pickupOrder) throw new NotFoundException('Invalid QR code');

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

  /**
   * Email doğrulama — müşteri kiosk'ta email girerek siparişlerini görebilir
   */
  async verifyCustomerEmail(email: string) {
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

  // =========================================
  // STATS
  // =========================================

  async getStats(merchantId: string) {
    const [pending, processing, ready, pickedUp, totalShelves] = await Promise.all([
      this.prisma.pickupOrder.count({ where: { merchantId, status: 'pending' } }),
      this.prisma.pickupOrder.count({ where: { merchantId, status: 'processing' } }),
      this.prisma.pickupOrder.count({ where: { merchantId, status: { in: ['ready', 'notified'] } } }),
      this.prisma.pickupOrder.count({ where: { merchantId, status: 'picked_up' } }),
      this.prisma.pickupShelf.count({ where: { merchantId, isActive: true } }),
    ]);
    return { pending, processing, ready, pickedUp, totalShelves };
  }
}
