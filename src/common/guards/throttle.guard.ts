import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  protected getTracker(context: ExecutionContext): Promise<string> {
    try {
      const request = context.switchToHttp().getRequest();
      const path = request.path || request.url || '';

      if (path.includes('/auth/login')) {
        this.logger.warn(
          `Login attempt from IP: ${this.getClientIP(request)}, User Agent: ${request.headers?.['user-agent'] || 'unknown'}`,
        );

        const email = request.body?.email || 'unknown';
        const clientIp = this.getClientIP(request);
        return Promise.resolve(`login:${clientIp}:${email}`);
      }

      if (request.user?.id) {
        return Promise.resolve(`user:${request.user.id}`);
      }

      const ip = this.getClientIP(request);
      return Promise.resolve(`ip:${ip}`);
    } catch {
      this.logger.debug('Non-HTTP context, skipping tracker');
      return Promise.resolve('non-http-context');
    }
  }

  private getClientIP(request: any): string {
    return (
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers?.['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}
