import { HttpException, HttpStatus } from '@nestjs/common';
import { BaseError } from '../errors/base.error';

export function handleError(error: unknown): never {
  if (error instanceof BaseError) {
    throw new HttpException(
      {
        ...error.serialize(),
        timestamp: new Date().toISOString(),
      },
      error.statusCode,
    );
  }

  if (error instanceof Error) {
    throw new HttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  throw new HttpException(
    {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      timestamp: new Date().toISOString(),
    },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}

export function isDuplicateKeyError(error: any): boolean {
  return (
    error?.code === '23505' || error?.errno === 1062 || error?.code === 11000
  );
}

export function isForeignKeyError(error: any): boolean {
  return error?.code === '23503' || error?.errno === 1452;
}
