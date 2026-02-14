import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export interface TransactionOptions {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
}
export interface TransactionResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}
export declare class TransactionService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    execute<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>, options?: TransactionOptions): Promise<TransactionResult<T>>;
    executeWithRetry<T>(operation: () => Promise<T>, maxRetries?: number, delayMs?: number): Promise<TransactionResult<T>>;
    batchExecute<T>(operations: Array<(tx: Prisma.TransactionClient) => Promise<T>>, options?: TransactionOptions): Promise<TransactionResult<T[]>>;
    private isRetryableError;
    private formatError;
    private delay;
}
