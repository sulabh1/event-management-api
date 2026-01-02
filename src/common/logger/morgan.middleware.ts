import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { winstonLogger } from './winston.logger';
import * as crypto from 'crypto';

// Create a stream for morgan to use winston
const stream = {
  write: (message: string) => {
    winstonLogger.http(message.trim());
  },
};

// Skip logging for health checks in production
const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production';
};

// Helper function to sanitize sensitive data
const sanitizeData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  const sensitiveFields = [
    'password',
    'token',
    'refreshToken',
    'confirmPassword',
    'newPassword',
    'currentPassword',
    'jwt',
    'accessToken',
    'secret',
    'creditCard',
    'cvv',
  ];

  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = '***';
    }
  });

  return sanitized;
};

// Extend Request interface using module augmentation (ES2015+ syntax)
import 'express';

declare module 'express' {
  export interface Request {
    id?: string;
  }
}

@Injectable()
export class MorganMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate request ID if not present
    if (!req.id) {
      req.id = crypto.randomBytes(16).toString('hex');
    }

    morgan.token('req-id', () => req.id || '-');

    morgan.token('req-body', (req: Request) => {
      const methods = ['POST', 'PUT', 'PATCH'];

      if (methods.includes(req.method) && req.body) {
        try {
          const sanitized = sanitizeData(req.body);
          return JSON.stringify(sanitized);
        } catch {
          return '-';
        }
      }
      return '-';
    });

    const format =
      ':req-id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - Body: :req-body';

    return morgan(format, { stream, skip })(req, res, next);
  }
}
