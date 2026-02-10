import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from 'generated/prisma/client';

interface ErrorResponse {
  success: boolean;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  details?: any;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error
    this.logError(exception, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Handle NestJS HTTP Exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return {
        success: false,
        statusCode: status,
        timestamp,
        path,
        method,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as unknown as { message: string }).message ||
              'An error occurred',
        error: exception.name,
        details:
          typeof exceptionResponse === 'object' ? exceptionResponse : undefined,
      };
    }

    // Handle Prisma Errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, timestamp, path, method);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp,
        path,
        method,
        message: 'Validation error in database query',
        error: 'PrismaValidationError',
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp,
        path,
        method,
        message: 'Database connection error',
        error: 'DatabaseConnectionError',
      };
    }

    // Handle unexpected errors
    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message: 'Internal server error',
      error: exception instanceof Error ? exception.name : 'UnknownError',
    };
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
    method: string,
  ): ErrorResponse {
    const baseResponse = {
      success: false,
      timestamp,
      path,
      method,
      error: 'DatabaseError',
    };

    switch (exception.code) {
      case 'P2002':
        // Unique constraint violation
        return {
          ...baseResponse,
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${((exception.meta?.target as string[]) || []).join(', ')} already exists`,
          details: { fields: (exception.meta?.target as string[]) || [] },
        };

      case 'P2025':
        // Record not found
        return {
          ...baseResponse,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
        };

      case 'P2003':
        // Foreign key constraint violation
        return {
          ...baseResponse,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related record',
        };

      case 'P2014':
        // Relation violation
        return {
          ...baseResponse,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid relation between records',
        };

      case 'P2000':
        // Value too long
        return {
          ...baseResponse,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Input value is too long',
        };

      case 'P2001':
        // Record does not exist
        return {
          ...baseResponse,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Referenced record does not exist',
        };

      case 'P2015':
        // Related record not found
        return {
          ...baseResponse,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Related record not found',
        };

      default:
        return {
          ...baseResponse,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          details: { code: exception.code },
        };
    }
  }

  private logError(exception: unknown, errorResponse: ErrorResponse) {
    const logMessage = `${errorResponse.method} ${errorResponse.path} - Status: ${errorResponse.statusCode}`;

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(logMessage, JSON.stringify(errorResponse.message));
    }
  }
}
