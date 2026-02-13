import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Standard API Error Response
 */
interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
  requestId?: string;
}

/**
 * Global Exception Filter - Handles all exceptions with consistent response format
 * Includes special handling for:
 * - Prisma database errors (constraint violations, not found, etc.)
 * - Validation errors (from class-validator)
 * - HTTP exceptions (standard NestJS errors)
 * - Unknown errors (500 Internal Server Error)
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log error with appropriate level
    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `[${errorResponse.statusCode}] ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(
        `[${errorResponse.statusCode}] ${request.method} ${request.url}: ${errorResponse.message}`,
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ApiErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Handle Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, path, timestamp);
    }

    // Handle Prisma validation errors
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Validation Error',
        message: 'Invalid data provided',
        details: { prismaError: 'VALIDATION_ERROR' },
        timestamp,
        path,
      };
    }

    // Handle HTTP exceptions (including validation errors from class-validator)
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, path, timestamp);
    }

    // Handle unknown errors
    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp,
      path,
    };
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    path: string,
    timestamp: string,
  ): ApiErrorResponse {
    const code = exception.code;

    switch (code) {
      case 'P2002': // Unique constraint violation
        const field = (exception.meta?.target as string[])?.join(', ') || 'field';
        return {
          success: false,
          statusCode: HttpStatus.CONFLICT,
          error: 'Duplicate Entry',
          message: `A record with this ${field} already exists`,
          details: { field, code },
          timestamp,
          path,
        };

      case 'P2025': // Record not found
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'The requested resource was not found',
          details: { code },
          timestamp,
          path,
        };

      case 'P2003': // Foreign key constraint failure
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Invalid Reference',
          message: 'Referenced record does not exist',
          details: { code },
          timestamp,
          path,
        };

      case 'P2014': // Required relation violation
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Invalid Data',
          message: 'Required related record is missing',
          details: { code },
          timestamp,
          path,
        };

      default:
        return {
          success: false,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Database Error',
          message: 'A database error occurred',
          details: { code },
          timestamp,
          path,
        };
    }
  }

  private handleHttpException(
    exception: HttpException,
    path: string,
    timestamp: string,
  ): ApiErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Handle validation errors from class-validator
    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const response = exceptionResponse as { message: string | string[]; error?: string };
      
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

  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
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
}




