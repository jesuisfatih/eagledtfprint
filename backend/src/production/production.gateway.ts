import { Injectable, Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Production WebSocket Gateway
 *
 * Real-time production status updates:
 * - Kanban board job movement
 * - Printer status changes (ink levels, status)
 * - Queue depth changes
 * - Delayed job alerts
 * - Gang sheet batch completion
 *
 * Clients subscribe to:
 *   production:{merchantId}  → all production events for a merchant
 *   printer:{printerId}      → specific printer events
 */

interface ProductionEvent {
  type:
    | 'job_moved'
    | 'job_created'
    | 'printer_status'
    | 'ink_level_warning'
    | 'batch_complete'
    | 'queue_update'
    | 'delayed_alert';
  data: Record<string, any>;
  timestamp: string;
}

@WebSocketGateway({
  namespace: '/production',
  cors: { origin: '*' },
})
@Injectable()
export class ProductionGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ProductionGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CLIENT SUBSCRIPTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @SubscribeMessage('subscribe:production')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { merchantId: string },
  ) {
    const room = `production:${data.merchantId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} subscribed to ${room}`);
    return { event: 'subscribed', room };
  }

  @SubscribeMessage('subscribe:printer')
  handlePrinterSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { printerId: string },
  ) {
    const room = `printer:${data.printerId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} subscribed to ${room}`);
    return { event: 'subscribed', room };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.leave(data.room);
    return { event: 'unsubscribed', room: data.room };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EMIT METHODS — Called from ProductionService
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Kanban board'da iş taşındığında */
  emitJobMoved(
    merchantId: string,
    jobData: {
      jobId: string;
      orderId: string;
      orderNumber: string;
      fromStatus: string;
      toStatus: string;
      productType: string;
      printerName?: string;
      operatorName?: string;
    },
  ) {
    this.server.to(`production:${merchantId}`).emit('production:event', {
      type: 'job_moved',
      data: jobData,
      timestamp: new Date().toISOString(),
    } as ProductionEvent);
  }

  /** Yeni iş oluşturulduğunda */
  emitJobCreated(
    merchantId: string,
    jobData: {
      jobId: string;
      orderId: string;
      orderNumber: string;
      productType: string;
      priority: string;
      dimensions: string;
    },
  ) {
    this.server.to(`production:${merchantId}`).emit('production:event', {
      type: 'job_created',
      data: jobData,
      timestamp: new Date().toISOString(),
    } as ProductionEvent);
  }

  /** Printer durumu değiştiğinde */
  emitPrinterStatus(
    merchantId: string,
    printerId: string,
    data: {
      printerName: string;
      status: string;
      previousStatus: string;
    },
  ) {
    this.server.to(`production:${merchantId}`).emit('production:event', {
      type: 'printer_status',
      data: { printerId, ...data },
      timestamp: new Date().toISOString(),
    } as ProductionEvent);

    this.server.to(`printer:${printerId}`).emit('production:event', {
      type: 'printer_status',
      data: { printerId, ...data },
      timestamp: new Date().toISOString(),
    } as ProductionEvent);
  }

  /** Mürekkep seviyesi düşükse uyarı */
  emitInkLevelWarning(
    merchantId: string,
    data: {
      printerId: string;
      printerName: string;
      color: string;
      level: number;
    },
  ) {
    this.server.to(`production:${merchantId}`).emit('production:event', {
      type: 'ink_level_warning',
      data,
      timestamp: new Date().toISOString(),
    } as ProductionEvent);
  }

  /** Gang sheet batch tamamlandığında */
  emitBatchComplete(
    merchantId: string,
    data: {
      batchId: string;
      fillRate: number;
      jobCount: number;
    },
  ) {
    this.server.to(`production:${merchantId}`).emit('production:event', {
      type: 'batch_complete',
      data,
      timestamp: new Date().toISOString(),
    } as ProductionEvent);
  }

  /** Queue derinliği değiştiğinde */
  emitQueueUpdate(
    merchantId: string,
    data: {
      queued: number;
      printing: number;
      ready: number;
      delayed: number;
    },
  ) {
    this.server.to(`production:${merchantId}`).emit('production:event', {
      type: 'queue_update',
      data,
      timestamp: new Date().toISOString(),
    } as ProductionEvent);
  }

  /** Geciken iş uyarısı */
  emitDelayedAlert(
    merchantId: string,
    data: {
      jobId: string;
      orderId: string;
      orderNumber: string;
      expectedReady: string;
      delayedMinutes: number;
    },
  ) {
    this.server.to(`production:${merchantId}`).emit('production:event', {
      type: 'delayed_alert',
      data,
      timestamp: new Date().toISOString(),
    } as ProductionEvent);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONNECTION MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  handleConnection(client: Socket) {
    this.logger.debug(`Production client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Production client disconnected: ${client.id}`);
  }

  /** Bağlı client sayısı */
  getConnectedCount(): number {
    return this.server?.sockets?.sockets?.size || 0;
  }
}
