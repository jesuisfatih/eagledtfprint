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
var TransactionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TransactionService = TransactionService_1 = class TransactionService {
    prisma;
    logger = new common_1.Logger(TransactionService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async execute(operation, options) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                return operation(tx);
            });
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            this.logger.error(`Transaction failed: ${error.message}`, error.stack);
            return {
                success: false,
                error: this.formatError(error),
            };
        }
    }
    async executeWithRetry(operation, maxRetries = 3, delayMs = 1000) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                return { success: true, data: result };
            }
            catch (error) {
                lastError = error;
                this.logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
                if (!this.isRetryableError(error) || attempt === maxRetries) {
                    break;
                }
                await this.delay(delayMs * attempt);
            }
        }
        return {
            success: false,
            error: this.formatError(lastError),
        };
    }
    async batchExecute(operations, options) {
        return this.execute(async (tx) => {
            const results = [];
            for (const operation of operations) {
                const result = await operation(tx);
                results.push(result);
            }
            return results;
        }, options);
    }
    isRetryableError(error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            const retryableCodes = ['P2028', 'P2034'];
            return retryableCodes.includes(error.code);
        }
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            return true;
        }
        return false;
    }
    formatError(error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.TransactionService = TransactionService;
exports.TransactionService = TransactionService = TransactionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransactionService);
//# sourceMappingURL=transaction.service.js.map