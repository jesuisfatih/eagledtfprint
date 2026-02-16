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
var NotificationsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    jwtService;
    configService;
    server;
    logger = new common_1.Logger(NotificationsGateway_1.name);
    connectedClients = new Map();
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async handleConnection(client) {
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
            client.userId = payload.sub;
            client.companyId = payload.companyId;
            client.merchantId = payload.merchantId;
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
            client.emit('connected', {
                socketId: client.id,
                userId: payload.sub,
                connectedAt: new Date(),
            });
        }
        catch (error) {
            this.logger.error(`Connection error for client ${client.id}:`, error);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.connectedClients.delete(client.id);
        this.logger.log(`❌ Client disconnected: ${client.id}`);
    }
    handleSubscribe(client, data) {
        if (data.channel) {
            client.join(data.channel);
            this.logger.log(`Client ${client.id} subscribed to ${data.channel}`);
            return { success: true, channel: data.channel };
        }
        return { success: false, error: 'Channel required' };
    }
    handleUnsubscribe(client, data) {
        if (data.channel) {
            client.leave(data.channel);
            this.logger.log(`Client ${client.id} unsubscribed from ${data.channel}`);
            return { success: true };
        }
        return { success: false, error: 'Channel required' };
    }
    handlePing(client) {
        return { event: 'pong', timestamp: Date.now() };
    }
    sendToUser(userId, notification) {
        this.server.to(`user:${userId}`).emit('notification', notification);
        this.logger.log(`📤 Notification sent to user ${userId}: ${notification.title}`);
    }
    sendToCompany(companyId, notification) {
        this.server.to(`company:${companyId}`).emit('notification', notification);
        this.logger.log(`📤 Notification sent to company ${companyId}: ${notification.title}`);
    }
    sendToMerchant(merchantId, notification) {
        this.server.to(`merchant:${merchantId}`).emit('notification', notification);
        this.logger.log(`📤 Notification sent to merchant ${merchantId}: ${notification.title}`);
    }
    broadcast(notification) {
        this.server.emit('notification', notification);
        this.logger.log(`📢 Broadcast notification: ${notification.title}`);
    }
    sendOrderUpdate(userId, orderId, status, data) {
        const notification = {
            id: `order-${orderId}-${Date.now()}`,
            type: 'order',
            title: 'Order Update',
            message: `Order #${orderId} status changed to ${status}`,
            data: { orderId, status, ...data },
            createdAt: new Date(),
        };
        this.sendToUser(userId, notification);
    }
    sendQuoteNotification(userId, quoteId, action) {
        const messages = {
            created: 'New quote request received',
            approved: 'Your quote has been approved',
            rejected: 'Your quote has been rejected',
        };
        const notification = {
            id: `quote-${quoteId}-${Date.now()}`,
            type: 'quote',
            title: 'Quote Update',
            message: messages[action],
            data: { quoteId, action },
            createdAt: new Date(),
        };
        this.sendToUser(userId, notification);
    }
    sendCartReminder(userId, cartId, itemCount) {
        const notification = {
            id: `cart-${cartId}-${Date.now()}`,
            type: 'cart',
            title: 'Items in Your Cart',
            message: `You have ${itemCount} item(s) waiting in your cart`,
            data: { cartId, itemCount },
            createdAt: new Date(),
        };
        this.sendToUser(userId, notification);
    }
    sendSyncComplete(merchantId, syncType, result) {
        const notification = {
            id: `sync-${Date.now()}`,
            type: 'sync',
            title: 'Sync Complete',
            message: `${syncType} sync completed: ${result.success} successful, ${result.failed} failed`,
            data: { syncType, ...result },
            createdAt: new Date(),
        };
        this.sendToMerchant(merchantId, notification);
    }
    extractToken(client) {
        const authHeader = client.handshake.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        const token = client.handshake.query.token;
        if (typeof token === 'string') {
            return token;
        }
        const authToken = client.handshake.auth?.token;
        if (typeof authToken === 'string') {
            return authToken;
        }
        return null;
    }
    async verifyToken(token) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            return {
                sub: payload.sub,
                companyId: payload.companyId,
                merchantId: payload.merchantId,
            };
        }
        catch {
            return null;
        }
    }
    getConnectedClientsCount() {
        return this.connectedClients.size;
    }
    isUserOnline(userId) {
        for (const client of this.connectedClients.values()) {
            if (client.userId === userId)
                return true;
        }
        return false;
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], NotificationsGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], NotificationsGateway.prototype, "handleUnsubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsGateway.prototype, "handlePing", null);
exports.NotificationsGateway = NotificationsGateway = NotificationsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: [
                process.env.ACCOUNTS_URL || 'http://localhost:3000',
                process.env.ADMIN_URL || 'http://localhost:3001',
                'http://localhost:3000',
                'http://localhost:3001',
            ],
            credentials: true,
        },
        namespace: '/notifications',
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map