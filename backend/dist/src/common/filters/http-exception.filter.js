"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const errorResponse = this.buildErrorResponse(exception, request);
        if (errorResponse.statusCode >= 500) {
            this.logger.error(`[${errorResponse.statusCode}] ${request.method} ${request.url}`, exception instanceof Error ? exception.stack : JSON.stringify(exception));
        }
        else {
            this.logger.warn(`[${errorResponse.statusCode}] ${request.method} ${request.url}: ${errorResponse.message}`);
        }
        response.status(errorResponse.statusCode).json(errorResponse);
    }
    buildErrorResponse(exception, request) {
        const timestamp = new Date().toISOString();
        const path = request.url;
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            return this.handlePrismaError(exception, path, timestamp);
        }
        if (exception instanceof client_1.Prisma.PrismaClientValidationError) {
            return {
                success: false,
                statusCode: common_1.HttpStatus.BAD_REQUEST,
                error: 'Validation Error',
                message: 'Invalid data provided',
                details: { prismaError: 'VALIDATION_ERROR' },
                timestamp,
                path,
            };
        }
        if (exception instanceof common_1.HttpException) {
            return this.handleHttpException(exception, path, timestamp);
        }
        return {
            success: false,
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
            timestamp,
            path,
        };
    }
    handlePrismaError(exception, path, timestamp) {
        const code = exception.code;
        switch (code) {
            case 'P2002':
                const field = exception.meta?.target?.join(', ') || 'field';
                return {
                    success: false,
                    statusCode: common_1.HttpStatus.CONFLICT,
                    error: 'Duplicate Entry',
                    message: `A record with this ${field} already exists`,
                    details: { field, code },
                    timestamp,
                    path,
                };
            case 'P2025':
                return {
                    success: false,
                    statusCode: common_1.HttpStatus.NOT_FOUND,
                    error: 'Not Found',
                    message: 'The requested resource was not found',
                    details: { code },
                    timestamp,
                    path,
                };
            case 'P2003':
                return {
                    success: false,
                    statusCode: common_1.HttpStatus.BAD_REQUEST,
                    error: 'Invalid Reference',
                    message: 'Referenced record does not exist',
                    details: { code },
                    timestamp,
                    path,
                };
            case 'P2014':
                return {
                    success: false,
                    statusCode: common_1.HttpStatus.BAD_REQUEST,
                    error: 'Invalid Data',
                    message: 'Required related record is missing',
                    details: { code },
                    timestamp,
                    path,
                };
            default:
                return {
                    success: false,
                    statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    error: 'Database Error',
                    message: 'A database error occurred',
                    details: { code },
                    timestamp,
                    path,
                };
        }
    }
    handleHttpException(exception, path, timestamp) {
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();
        if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
            const response = exceptionResponse;
            return {
                success: false,
                statusCode: status,
                error: response.error || this.getErrorName(status),
                message: response.message,
                timestamp,
                path,
            };
        }
        return {
            success: false,
            statusCode: status,
            error: this.getErrorName(status),
            message: typeof exceptionResponse === 'string' ? exceptionResponse : 'An error occurred',
            timestamp,
            path,
        };
    }
    getErrorName(status) {
        const errorNames = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
        };
        return errorNames[status] || 'Error';
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map