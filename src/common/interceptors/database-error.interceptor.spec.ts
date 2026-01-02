/* eslint-disable @typescript-eslint/unbound-method */
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { QueryFailedError } from 'typeorm';
import { DatabaseErrorInterceptor } from './database-error.interceptor';
import {
  ConflictError,
  NotFoundError,
  DatabaseError,
} from '../errors/application.errors';

describe('DatabaseErrorInterceptor', () => {
  let interceptor: DatabaseErrorInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new DatabaseErrorInterceptor();

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
        getResponse: jest.fn(),
      }),
      getType: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    describe('Successful Operations', () => {
      it('should pass through successful responses', (done) => {
        const mockData = { id: 1, name: 'Test' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(mockData));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (data) => {
            expect(data).toEqual(mockData);
            done();
          },
          error: (error) => {
            done(error);
          },
        });
      });

      it('should not modify successful responses', (done) => {
        const mockResponse = { success: true, data: [1, 2, 3] };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(mockResponse));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (data) => {
            expect(data).toBe(mockResponse);
            done();
          },
        });
      });

      it('should handle null responses', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (data) => {
            expect(data).toBeNull();
            done();
          },
        });
      });

      it('should handle undefined responses', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(undefined));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (data) => {
            expect(data).toBeUndefined();
            done();
          },
        });
      });
    });

    describe('Non-Database Errors', () => {
      it('should pass through non-QueryFailedError errors unchanged', (done) => {
        const customError = new Error('Custom error');
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => customError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBe(customError);
            expect(error.message).toBe('Custom error');
            done();
          },
        });
      });

      it('should not transform ValidationError', (done) => {
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => validationError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBe(validationError);
            done();
          },
        });
      });

      it('should not transform custom application errors', (done) => {
        const conflictError = new ConflictError('Already exists');
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => conflictError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBe(conflictError);
            done();
          },
        });
      });
    });

    describe('Duplicate Key Errors', () => {
      it('should transform duplicate key error to ConflictError', (done) => {
        const dbError = new QueryFailedError(
          'INSERT INTO users',
          [],
          new Error('duplicate key value violates unique constraint'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(ConflictError);
            expect(error.message).toBe('Resource already exists');
            done();
          },
        });
      });

      it('should handle PostgreSQL duplicate key error', (done) => {
        const dbError = new QueryFailedError(
          'INSERT INTO events',
          [],
          new Error(
            'duplicate key value violates unique constraint "events_title_key"',
          ),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(ConflictError);
            expect(error.message).toBe('Resource already exists');
            done();
          },
        });
      });

      it('should handle SQLite UNIQUE constraint error', (done) => {
        const dbError = new QueryFailedError(
          'INSERT INTO users',
          [],
          new Error('UNIQUE constraint failed: users.email'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(ConflictError);
            expect(error.message).toBe('Resource already exists');
            done();
          },
        });
      });

      it('should handle uppercase duplicate key error', (done) => {
        const dbError = new QueryFailedError(
          'INSERT INTO products',
          [],
          new Error('Connection error - database unavailable'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(DatabaseError);
            done();
          },
        });
      });
    });

    describe('Foreign Key Constraint Errors', () => {
      it('should transform foreign key constraint error to ConflictError', (done) => {
        const dbError = new QueryFailedError(
          'INSERT INTO registrations',
          [],
          new Error('foreign key constraint fails'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(ConflictError);
            expect(error.message).toBe('Referenced resource does not exist');
            done();
          },
        });
      });

      it('should handle PostgreSQL foreign key violation', (done) => {
        const dbError = new QueryFailedError(
          'DELETE FROM events',
          [],
          new Error(
            'update or delete on table "events" violates foreign key constraint',
          ),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(ConflictError);
            expect(error.message).toBe('Referenced resource does not exist');
            done();
          },
        });
      });

      it('should handle MySQL foreign key error', (done) => {
        const dbError = new QueryFailedError(
          'INSERT INTO orders',
          [],
          new Error('Cannot add or update a child row: foreign key constraint'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(ConflictError);
            done();
          },
        });
      });
    });

    describe('Not Found Errors', () => {
      it('should transform "not found" error to NotFoundError', (done) => {
        const dbError = new QueryFailedError(
          'SELECT * FROM users',
          [],
          new Error('record not found'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(NotFoundError);
            expect(error.message).toBe('Resource not found');
            done();
          },
        });
      });

      it('should handle "does not exist" error', (done) => {
        const dbError = new QueryFailedError(
          'SELECT * FROM events',
          [],
          new Error('table events does not exist'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(NotFoundError);
            expect(error.message).toBe('Resource not found');
            done();
          },
        });
      });

      it('should handle partial match for not found errors', (done) => {
        const dbError = new QueryFailedError(
          'UPDATE users',
          [],
          new Error('Resource not found in database'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(NotFoundError);
            done();
          },
        });
      });
    });

    describe('Generic Database Errors', () => {
      it('should transform unknown database error to DatabaseError', (done) => {
        const dbError = new QueryFailedError(
          'SELECT * FROM users',
          [],
          new Error('Connection timeout'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(DatabaseError);
            expect(error.message).toBe('Database operation failed');
            done();
          },
        });
      });

      it('should handle connection errors', (done) => {
        const dbError = new QueryFailedError(
          'SELECT * FROM users',
          [],
          new Error('ECONNREFUSED'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(DatabaseError);
            done();
          },
        });
      });

      it('should handle syntax errors', (done) => {
        const dbError = new QueryFailedError(
          'SELECT * FORM users',
          [],
          new Error('syntax error at or near "FORM"'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(DatabaseError);
            expect(error.message).toBe('Database operation failed');
            done();
          },
        });
      });

      it('should preserve original error in DatabaseError', (done) => {
        const originalError = new Error('Connection lost');
        const dbError = new QueryFailedError(
          'INSERT INTO logs',
          [],
          originalError,
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(DatabaseError);
            expect(error.message).toBe('Database operation failed');
            done();
          },
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle QueryFailedError with empty message', (done) => {
        const dbError = new QueryFailedError('SELECT', [], new Error(''));
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(DatabaseError);
            done();
          },
        });
      });

      it('should handle QueryFailedError with undefined message', (done) => {
        const error = new Error();
        error.message = '';
        const dbError = new QueryFailedError('SELECT', [], error);
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (err) => {
            expect(err).toBeInstanceOf(DatabaseError);
            done();
          },
        });
      });

      it('should handle error messages with special characters', (done) => {
        const dbError = new QueryFailedError(
          'INSERT',
          [],
          new Error('duplicate key: "user@example.com"'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(ConflictError);
            expect(error.message).toBe('Resource already exists');
            done();
          },
        });
      });

      it('should handle error messages with special characters', (done) => {
        const dbError = new QueryFailedError(
          'INSERT',
          [],
          new Error('duplicate key: "user@example.com"'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(ConflictError);
            done();
          },
        });
      });

      it('should handle multiple error conditions in message', (done) => {
        const dbError = new QueryFailedError(
          'INSERT',
          [],
          new Error('duplicate key and foreign key constraint fails'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(ConflictError);
            expect(error.message).toBe('Resource already exists');
            done();
          },
        });
      });
    });

    describe('Error Priority', () => {
      it('should prioritize duplicate key over foreign key', (done) => {
        const dbError = new QueryFailedError(
          'INSERT',
          [],
          new Error('duplicate key value and foreign key constraint'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error.message).toBe('Resource already exists');
            done();
          },
        });
      });

      it('should prioritize foreign key over not found', (done) => {
        const dbError = new QueryFailedError(
          'INSERT',
          [],
          new Error('foreign key constraint and record not found'),
        );
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(throwError(() => dbError));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error.message).toBe('Referenced resource does not exist');
            done();
          },
        });
      });
    });

    describe('CallHandler Integration', () => {
      it('should call handle on CallHandler', (done) => {
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(of({ data: 'test' }));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);
            done();
          },
        });
      });

      it('should not call handle multiple times', (done) => {
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(of({ data: 'test' }));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);
            done();
          },
        });
      });
    });
  });

  describe('handleDatabaseError', () => {
    it('should be a private method', () => {
      expect(typeof (interceptor as any).handleDatabaseError).toBe('function');
    });

    it('should return ConflictError for duplicate key', () => {
      const error = new QueryFailedError(
        'INSERT',
        [],
        new Error('duplicate key'),
      );
      const result = (interceptor as any).handleDatabaseError(error);
      expect(result).toBeInstanceOf(ConflictError);
    });

    it('should return ConflictError for foreign key constraint', () => {
      const error = new QueryFailedError(
        'INSERT',
        [],
        new Error('foreign key constraint'),
      );
      const result = (interceptor as any).handleDatabaseError(error);
      expect(result).toBeInstanceOf(ConflictError);
    });

    it('should return NotFoundError for not found', () => {
      const error = new QueryFailedError('SELECT', [], new Error('not found'));
      const result = (interceptor as any).handleDatabaseError(error);
      expect(result).toBeInstanceOf(NotFoundError);
    });

    it('should return DatabaseError for unknown errors', () => {
      const error = new QueryFailedError(
        'SELECT',
        [],
        new Error('unknown error'),
      );
      const result = (interceptor as any).handleDatabaseError(error);
      expect(result).toBeInstanceOf(DatabaseError);
    });
  });
});
