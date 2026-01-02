import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseError } from '../errors/base.error';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Handle our custom errors
    if (exception instanceof BaseError) {
      const errorResponse = exception.serialize();
      const status = errorResponse.statusCode;

      this.logError(exception, request, status);

      return response.status(status).json({
        success: false,
        ...errorResponse,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: (request as any).id,
      });
    }

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      let details: any;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = (exceptionResponse as any).message || exception.message;
        details = (exceptionResponse as any).error;
      }

      this.logError(exception, request, status);

      return response.status(status).json({
        success: false,
        statusCode: status,
        errorCode: this.getErrorCode(status),
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: (request as any).id,
      });
    }

    // Handle unknown errors
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = this.getProductionSafeMessage(exception);

    this.logError(exception, request, status);

    return response.status(status).json({
      success: false,
      statusCode: status,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as any).id,
    });
  }

  private logError(exception: unknown, request: Request, status: number) {
    const logData = {
      statusCode: status,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      userId: (request as any).user?.userId,
      requestId: (request as any).id,
    };

    const logMessage = `${request.method} ${request.url} ${status}`;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : '',
        'HttpExceptionFilter',
      );
      this.logger.error(
        'Error details',
        JSON.stringify(logData),
        'HttpExceptionFilter',
      );
    } else if (status >= 400) {
      this.logger.warn(logMessage, 'HttpExceptionFilter');
      this.logger.warn(JSON.stringify(logData), 'HttpExceptionFilter');
    }
  }

  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };

    return errorCodes[status] || 'UNKNOWN_ERROR';
  }

  private getProductionSafeMessage(exception: unknown): string {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      return 'Internal server error';
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Unknown error occurred';
  }
}
