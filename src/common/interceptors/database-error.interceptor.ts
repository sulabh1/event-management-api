import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QueryFailedError } from 'typeorm';
import {
  DatabaseError,
  ConflictError,
  NotFoundError,
} from '../errors/application.errors';
import { BaseError } from '../errors/base.error';

@Injectable()
export class DatabaseErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof QueryFailedError) {
          const databaseError = this.handleDatabaseError(error);
          return throwError(() => databaseError);
        }
        return throwError(() => error);
      }),
    );
  }

  private handleDatabaseError(error: QueryFailedError): BaseError {
    const errorMessage = error.message;

    if (
      errorMessage.includes('duplicate key') ||
      errorMessage.includes('UNIQUE constraint')
    ) {
      return new ConflictError('Resource already exists');
    }

    if (errorMessage.includes('foreign key constraint')) {
      return new ConflictError('Referenced resource does not exist');
    }

    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist')
    ) {
      return new NotFoundError('Resource');
    }

    return new DatabaseError('Database operation failed', error);
  }
}
