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
var ProductionGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductionGateway = ProductionGateway_1 = class ProductionGateway {
    prisma;
    server;
    logger = new common_1.Logger(ProductionGateway_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    handleSubscribe(client, data) {
        const room = `production:${data.merchantId}`;
        client.join(room);
        this.logger.debug(`Client ${client.id} subscribed to ${room}`);
        return { event: 'subscribed', room };
    }
    handlePrinterSubscribe(client, data) {
        const room = `printer:${data.printerId}`;
        client.join(room);
        this.logger.debug(`Client ${client.id} subscribed to ${room}`);
        return { event: 'subscribed', room };
    }
    handleUnsubscribe(client, data) {
        client.leave(data.room);
        return { event: 'unsubscribed', room: data.room };
    }
    emitJobMoved(merchantId, jobData) {
        this.server.to(`production:${merchantId}`).emit('production:event', {
            type: 'job_moved',
            data: jobData,
            timestamp: new Date().toISOString(),
        });
    }
    emitJobCreated(merchantId, jobData) {
        this.server.to(`production:${merchantId}`).emit('production:event', {
            type: 'job_created',
            data: jobData,
            timestamp: new Date().toISOString(),
        });
    }
    emitPrinterStatus(merchantId, printerId, data) {
        this.server.to(`production:${merchantId}`).emit('production:event', {
            type: 'printer_status',
            data: { printerId, ...data },
            timestamp: new Date().toISOString(),
        });
        this.server.to(`printer:${printerId}`).emit('production:event', {
            type: 'printer_status',
            data: { printerId, ...data },
            timestamp: new Date().toISOString(),
        });
    }
    emitInkLevelWarning(merchantId, data) {
        this.server.to(`production:${merchantId}`).emit('production:event', {
            type: 'ink_level_warning',
            data,
            timestamp: new Date().toISOString(),
        });
    }
    emitBatchComplete(merchantId, data) {
        this.server.to(`production:${merchantId}`).emit('production:event', {
            type: 'batch_complete',
            data,
            timestamp: new Date().toISOString(),
        });
    }
    emitQueueUpdate(merchantId, data) {
        this.server.to(`production:${merchantId}`).emit('production:event', {
            type: 'queue_update',
            data,
            timestamp: new Date().toISOString(),
        });
    }
    emitDelayedAlert(merchantId, data) {
        this.server.to(`production:${merchantId}`).emit('production:event', {
            type: 'delayed_alert',
            data,
            timestamp: new Date().toISOString(),
        });
    }
    handleConnection(client) {
        this.logger.debug(`Production client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.debug(`Production client disconnected: ${client.id}`);
    }
    getConnectedCount() {
        return this.server?.sockets?.sockets?.size || 0;
    }
};
exports.ProductionGateway = ProductionGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ProductionGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:production'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ProductionGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:printer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ProductionGateway.prototype, "handlePrinterSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ProductionGateway.prototype, "handleUnsubscribe", null);
exports.ProductionGateway = ProductionGateway = ProductionGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/production',
        cors: { origin: '*' },
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductionGateway);
//# sourceMappingURL=production.gateway.js.map