import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class ErrorBoundaryMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      next();
    } catch (error) {
      this.logger.error(
        `Synchronous error: ${error.message}`,
        error.stack,
        'ErrorBoundaryMiddleware',
      );

      this.logger.error(
        'Request details',
        JSON.stringify({
          method: req.method,
          url: req.url,
          requestId: (req as any).id,
        }),
        'ErrorBoundaryMiddleware',
      );

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          statusCode: 500,
          errorCode: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
          path: req.url,
          requestId: (req as any).id,
        });
      }
    }
  }
}
