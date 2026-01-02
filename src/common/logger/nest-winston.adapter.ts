import { LoggerService, LogLevel } from '@nestjs/common';
import { winstonLogger } from './winston.logger';

export class NestWinstonAdapter implements LoggerService {
  private readonly logLevels: LogLevel[] = [
    'log',
    'error',
    'warn',
    'debug',
    'verbose',
  ];

  constructor() {
    this.setLogLevels(this.logLevels);
  }

  setLogLevels(levels: LogLevel[]) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    (this.logLevels as LogLevel[]).splice(0, this.logLevels.length, ...levels);
  }

  log(message: any, context?: string) {
    if (this.isLevelEnabled('log')) {
      winstonLogger.info(message, { context });
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (this.isLevelEnabled('error')) {
      winstonLogger.error(message, { context, trace });
    }
  }

  warn(message: any, context?: string) {
    if (this.isLevelEnabled('warn')) {
      winstonLogger.warn(message, { context });
    }
  }

  debug(message: any, context?: string) {
    if (this.isLevelEnabled('debug')) {
      winstonLogger.debug(message, { context });
    }
  }

  verbose(message: any, context?: string) {
    if (this.isLevelEnabled('verbose')) {
      winstonLogger.verbose(message, { context });
    }
  }

  private isLevelEnabled(level: LogLevel): boolean {
    return this.logLevels.includes(level);
  }
}
