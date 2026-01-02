import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: {
      method?: string;
      url?: string;
      ip?: string;
    } = context.switchToHttp().getRequest();
    const method = request.method ?? 'UNKNOWN_METHOD';
    const url = request.url ?? 'UNKNOWN_URL';
    const ip = request.ip ?? 'UNKNOWN_IP';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context
            .switchToHttp()
            .getResponse<{ statusCode?: number }>();
          const statusCode = response.statusCode ?? 200;
          const duration = Date.now() - now;

          this.logger.log(
            `${method} ${url} ${statusCode} - ${duration}ms - ${ip}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          const status =
            typeof error === 'object' && error !== null && 'status' in error
              ? ((error as { status?: number }).status ?? 500)
              : 500;
          const message =
            typeof error === 'object' && error !== null && 'message' in error
              ? (error as { message?: string }).message
              : String(error);
          this.logger.error(
            `${method} ${url} ${status} - ${duration}ms - ${ip} - ${message}`,
          );
        },
      }),
    );
  }
}
