import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { LoggerService } from '../logger/logger.service';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  private readonly logger = new LoggerService();

  constructor() {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        const response = ctx.getResponse();

        if ((request as any).id) {
          response.setHeader('X-Request-ID', (request as any).id);
        }

        const remaining = response.getHeader('X-RateLimit-Remaining');
        const limit = response.getHeader('X-RateLimit-Limit');
        const reset = response.getHeader('X-RateLimit-Reset');

        if (remaining !== undefined) {
          response.setHeader('X-RateLimit-Remaining', remaining);
          response.setHeader('X-RateLimit-Limit', limit);
          response.setHeader('X-RateLimit-Reset', reset);
        }

        return {
          success: true,
          data,
          message: this.getMessage(request.method),
          timestamp: new Date().toISOString(),
          requestId: (request as any).id,
        };
      }),
    );
  }

  private getMessage(method: string): string {
    switch (method) {
      case 'GET':
        return 'Request successful';
      case 'POST':
        return 'Created successfully';
      case 'PUT':
        return 'Updated successfully';
      case 'PATCH':
        return 'Updated successfully';
      case 'DELETE':
        return 'Deleted successfully';
      default:
        return 'Request successful';
    }
  }
}
