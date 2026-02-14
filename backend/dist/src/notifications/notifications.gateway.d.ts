import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private configService;
    server: Server;
    private readonly logger;
    private connectedClients;
    constructor(jwtService: JwtService, configService: ConfigService);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleSubscribe(client: AuthenticatedSocket, data: {
        channel: string;
    }): {
        success: boolean;
        channel: string;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        channel?: undefined;
    };
    handleUnsubscribe(client: AuthenticatedSocket, data: {
        channel: string;
    }): {
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    };
    handlePing(client: AuthenticatedSocket): {
        event: string;
        timestamp: number;
    };
    sendToUser(userId: string, notification: NotificationPayload): void;
    sendToCompany(companyId: string, notification: NotificationPayload): void;
    sendToMerchant(merchantId: string, notification: NotificationPayload): void;
    broadcast(notification: NotificationPayload): void;
    sendOrderUpdate(userId: string, orderId: string, status: string, data?: Record<string, unknown>): void;
    sendQuoteNotification(userId: string, quoteId: string, action: 'created' | 'approved' | 'rejected'): void;
    sendCartReminder(userId: string, cartId: string, itemCount: number): void;
    sendSyncComplete(merchantId: string, syncType: string, result: {
        success: number;
        failed: number;
    }): void;
    private extractToken;
    private verifyToken;
    getConnectedClientsCount(): number;
    isUserOnline(userId: string): boolean;
}
export {};
