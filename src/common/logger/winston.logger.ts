import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

const logDir = 'logs';
const isProduction = process.env.NODE_ENV === 'production';

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    verbose: 5,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
    verbose: 'cyan',
  },
};

winston.addColors(customLevels.colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(
    ({ timestamp, level, message, stack, context, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]`;

      if (context) {
        log += ` [${context}]`;
      }

      log += ` ${message}`;

      if (stack) {
        log += `\n${stack}`;
      }

      const filteredMeta = { ...meta };
      delete filteredMeta.service;

      if (
        Object.keys(filteredMeta).length > 0 &&
        !(
          Object.keys(filteredMeta).length === 1 &&
          filteredMeta.hasOwnProperty('0')
        )
      ) {
        log += `\n${JSON.stringify(filteredMeta, null, 2)}`;
      }

      return log;
    },
  ),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, context }) => {
    let log = `${timestamp} [${level}]`;

    if (context) {
      log += ` [${context}]`;
    }

    log += ` ${message}`;

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  }),
);

export const winstonLogger = winston.createLogger({
  levels: customLevels.levels,
  level: isProduction ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'event-management-api' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      level: isProduction ? 'info' : 'debug',
    }),

    // Daily rotate file for errors
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),

    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),

    new DailyRotateFile({
      filename: path.join(logDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),
  ],

  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],

  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

export const httpLogger = {
  log: (message: string, meta?: any) => {
    winstonLogger.log('info', message, meta);
  },
};
