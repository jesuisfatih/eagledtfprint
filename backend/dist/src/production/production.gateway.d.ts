import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
export declare class ProductionGateway {
    private readonly prisma;
    server: Server;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleSubscribe(client: Socket, data: {
        merchantId: string;
    }): {
        event: string;
        room: string;
    };
    handlePrinterSubscribe(client: Socket, data: {
        printerId: string;
    }): {
        event: string;
        room: string;
    };
    handleUnsubscribe(client: Socket, data: {
        room: string;
    }): {
        event: string;
        room: string;
    };
    emitJobMoved(merchantId: string, jobData: {
        jobId: string;
        orderId: string;
        orderNumber: string;
        fromStatus: string;
        toStatus: string;
        productType: string;
        printerName?: string;
        operatorName?: string;
    }): void;
    emitJobCreated(merchantId: string, jobData: {
        jobId: string;
        orderId: string;
        orderNumber: string;
        productType: string;
        priority: string;
        dimensions: string;
    }): void;
    emitPrinterStatus(merchantId: string, printerId: string, data: {
        printerName: string;
        status: string;
        previousStatus: string;
    }): void;
    emitInkLevelWarning(merchantId: string, data: {
        printerId: string;
        printerName: string;
        color: string;
        level: number;
    }): void;
    emitBatchComplete(merchantId: string, data: {
        batchId: string;
        fillRate: number;
        jobCount: number;
    }): void;
    emitQueueUpdate(merchantId: string, data: {
        queued: number;
        printing: number;
        ready: number;
        delayed: number;
    }): void;
    emitDelayedAlert(merchantId: string, data: {
        jobId: string;
        orderId: string;
        orderNumber: string;
        expectedReady: string;
        delayedMinutes: number;
    }): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    getConnectedCount(): number;
}
