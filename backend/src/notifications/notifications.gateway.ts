import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
  merchantId?: string;
}

interface NotificationPayload {
  id: string;
  type: 'order' | 'quote' | 'approval' | 'system' | 'sync' | 'cart';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * WebSocket Gateway for Real-time Notifications
 * 
 * Handles:
 * - User connection with JWT authentication
 * - Room-based notifications (per user, company, merchant)
 * - Real-time order updates
 * - Quote approval notifications
 * - System-wide announcements
 */
@WebSocketGateway({
  cors: {
    origin: [
      'https://accounts.eagledtfsupply.com',
      'https://app.eagledtfsupply.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  },
  namespace: '/notifications',
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Handle client connection with JWT authentication
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        client.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);
      
      if (!payload) {
        this.logger.warn(`Client ${client.id} provided invalid token`);
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = payload.sub;
      client.companyId = payload.companyId;
      client.merchantId = payload.merchantId;

      // Join rooms for targeted notifications
      if (payload.sub) {
        client.join(`user:${payload.sub}`);
      }
      if (payload.companyId) {
        client.join(`company:${payload.companyId}`);
      }
      if (payload.merchantId) {
        client.join(`merchant:${payload.merchantId}`);
      }

      this.connectedClients.set(client.id, client);
      this.logger.log(`✅ Client connected: ${client.id} (User: ${payload.sub})`);

      // Send connection confirmation
      client.emit('connected', {
        socketId: client.id,
        userId: payload.sub,
        connectedAt: new Date(),
      });

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`❌ Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to specific notification channels
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channel: string },
  ) {
    if (data.channel) {
      client.join(data.channel);
      this.logger.log(`Client ${client.id} subscribed to ${data.channel}`);
      return { success: true, channel: data.channel };
    }
    return { success: false, error: 'Channel required' };
  }

  /**
   * Unsubscribe from notification channel
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channel: string },
  ) {
    if (data.channel) {
      client.leave(data.channel);
      this.logger.log(`Client ${client.id} unsubscribed from ${data.channel}`);
      return { success: true };
    }
    return { success: false, error: 'Channel required' };
  }

  /**
   * Handle ping/pong for connection health
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    return { event: 'pong', timestamp: Date.now() };
  }

  // ============================================
  // NOTIFICATION EMITTERS
  // ============================================

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, notification: NotificationPayload) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`📤 Notification sent to user ${userId}: ${notification.title}`);
  }

  /**
   * Send notification to all users in a company
   */
  sendToCompany(companyId: string, notification: NotificationPayload) {
    this.server.to(`company:${companyId}`).emit('notification', notification);
    this.logger.log(`📤 Notification sent to company ${companyId}: ${notification.title}`);
  }

  /**
   * Send notification to all users under a merchant
   */
  sendToMerchant(merchantId: string, notification: NotificationPayload) {
    this.server.to(`merchant:${merchantId}`).emit('notification', notification);
    this.logger.log(`📤 Notification sent to merchant ${merchantId}: ${notification.title}`);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(notification: NotificationPayload) {
    this.server.emit('notification', notification);
    this.logger.log(`📢 Broadcast notification: ${notification.title}`);
  }

  /**
   * Send order status update
   */
  sendOrderUpdate(userId: string, orderId: string, status: string, data?: Record<string, unknown>) {
    const notification: NotificationPayload = {
      id: `order-${orderId}-${Date.now()}`,
      type: 'order',
      title: 'Order Update',
      message: `Order #${orderId} status changed to ${status}`,
      data: { orderId, status, ...data },
      createdAt: new Date(),
    };
    this.sendToUser(userId, notification);
  }

  /**
   * Send quote notification
   */
  sendQuoteNotification(userId: string, quoteId: string, action: 'created' | 'approved' | 'rejected') {
    const messages = {
      created: 'New quote request received',
      approved: 'Your quote has been approved',
      rejected: 'Your quote has been rejected',
    };
    
    const notification: NotificationPayload = {
      id: `quote-${quoteId}-${Date.now()}`,
      type: 'quote',
      title: 'Quote Update',
      message: messages[action],
      data: { quoteId, action },
      createdAt: new Date(),
    };
    this.sendToUser(userId, notification);
  }

  /**
   * Send cart abandonment reminder
   */
  sendCartReminder(userId: string, cartId: string, itemCount: number) {
    const notification: NotificationPayload = {
      id: `cart-${cartId}-${Date.now()}`,
      type: 'cart',
      title: 'Items in Your Cart',
      message: `You have ${itemCount} item(s) waiting in your cart`,
      data: { cartId, itemCount },
      createdAt: new Date(),
    };
    this.sendToUser(userId, notification);
  }

  /**
   * Send sync completion notification (admin)
   */
  sendSyncComplete(merchantId: string, syncType: string, result: { success: number; failed: number }) {
    const notification: NotificationPayload = {
      id: `sync-${Date.now()}`,
      type: 'sync',
      title: 'Sync Complete',
      message: `${syncType} sync completed: ${result.success} successful, ${result.failed} failed`,
      data: { syncType, ...result },
      createdAt: new Date(),
    };
    this.sendToMerchant(merchantId, notification);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private extractToken(client: Socket): string | null {
    // Try Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query parameter
    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }

    // Try auth object
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string') {
      return authToken;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<{ sub: string; companyId?: string; merchantId?: string } | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return {
        sub: payload.sub,
        companyId: payload.companyId,
        merchantId: payload.merchantId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get count of connected clients
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    for (const client of this.connectedClients.values()) {
      if (client.userId === userId) return true;
    }
    return false;
  }
}
