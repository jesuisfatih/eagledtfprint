import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Transaction Options
 */
export interface TransactionOptions {
  maxWait?: number; // Maximum time to wait for acquiring a connection (ms)
  timeout?: number; // Maximum time for the transaction to complete (ms)
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Transaction Result
 */
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Transaction Helper Service
 * Provides a clean API for running Prisma transactions with consistent error handling
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Execute a transaction with automatic rollback on error
   * @param operation - The transaction operation to execute
   * @param options - Transaction options (timeout, isolation level)
   * @returns TransactionResult with success status and data or error
   */
  async execute<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<TransactionResult<T>> {
    try {
      // In Prisma 7+, $transaction with a function doesn't accept options as second arg
      // Use the simple callback form
      const result = await this.prisma.$transaction(async (tx) => {
        return operation(tx);
      }) as T;

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`Transaction failed: ${error.message}`, error.stack);

      return {
        success: false,
        error: this.formatError(error),
      };
    }
  }

  /**
   * Execute a simple operation with retry logic
   * @param operation - The operation to execute
   * @param maxRetries - Maximum number of retry attempts
   * @param delayMs - Delay between retries in milliseconds
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<TransactionResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return { success: true, data: result };
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}): ${error.message}`);

        // Only retry on transient errors
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          break;
        }

        await this.delay(delayMs * attempt); // Exponential backoff
      }
    }

    return {
      success: false,
      error: this.formatError(lastError),
    };
  }

  /**
   * Batch execute multiple operations in a single transaction
   */
  async batchExecute<T>(
    operations: Array<(tx: Prisma.TransactionClient) => Promise<T>>,
    options?: TransactionOptions,
  ): Promise<TransactionResult<T[]>> {
    return this.execute(async (tx) => {
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }
      return results;
    }, options);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Prisma transaction conflicts
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const retryableCodes = ['P2028', 'P2034']; // Transaction conflicts
      return retryableCodes.includes(error.code);
    }

    // Connection errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    return false;
  }

  /**
   * Format error for response
   */
  private formatError(error: any): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return 'A record with this value already exists';
        case 'P2025':
          return 'Record not found';
        case 'P2003':
          return 'Referenced record does not exist';
        default:
          return 'Database operation failed';
      }
    }

    return error?.message || 'An unexpected error occurred';
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
