import { BaseError } from './base.error';
import { ValidationError as ClassValidatorError } from 'class-validator';
import { StatusCodes } from 'http-status-codes';

export class ValidationError extends BaseError {
  statusCode = StatusCodes.BAD_REQUEST;
  errorCode = 'VALIDATION_FAILED';

  constructor(
    public readonly errors: ClassValidatorError[],
    message = 'Validation failed',
  ) {
    super(message);
  }

  serialize() {
    const formattedErrors = this.errors.map((error) => ({
      field: error.property,
      constraints: error.constraints,
      value: error.value,
    }));

    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
      details: { errors: formattedErrors },
    };
  }
}

export class AuthenticationError extends BaseError {
  statusCode = StatusCodes.UNAUTHORIZED;
  errorCode = 'AUTHENTICATION_FAILED';

  constructor(message = 'Authentication required') {
    super(message);
  }

  serialize() {
    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
    };
  }
}

export class AuthorizationError extends BaseError {
  statusCode = StatusCodes.FORBIDDEN;
  errorCode = 'PERMISSION_DENIED';

  constructor(message = 'Insufficient permissions') {
    super(message);
  }

  serialize() {
    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
    };
  }
}

export class NotFoundError extends BaseError {
  statusCode = StatusCodes.NOT_FOUND;
  errorCode = 'RESOURCE_NOT_FOUND';

  constructor(resource: string, id?: string) {
    super(id ? `${resource} with ID ${id} not found` : `${resource} not found`);
  }

  serialize() {
    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
    };
  }
}

export class ConflictError extends BaseError {
  statusCode = StatusCodes.CONFLICT;
  errorCode = 'RESOURCE_CONFLICT';

  constructor(message = 'Resource already exists') {
    super(message);
  }

  serialize() {
    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
    };
  }
}

export class DatabaseError extends BaseError {
  statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  errorCode = 'DATABASE_ERROR';

  constructor(
    message = 'Database operation failed',
    public readonly originalError?: any,
  ) {
    super(message);
  }

  serialize() {
    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
      details:
        process.env.NODE_ENV === 'development'
          ? { originalError: this.originalError?.message }
          : undefined,
    };
  }
}

export class RateLimitError extends BaseError {
  statusCode = StatusCodes.TOO_MANY_REQUESTS;
  errorCode = 'RATE_LIMIT_EXCEEDED';

  constructor(message = 'Too many requests') {
    super(message);
  }

  serialize() {
    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
    };
  }
}

export class ServiceUnavailableError extends BaseError {
  statusCode = StatusCodes.SERVICE_UNAVAILABLE;
  errorCode = 'SERVICE_UNAVAILABLE';

  constructor(service: string, message = 'Service temporarily unavailable') {
    super(`${service}: ${message}`);
  }

  serialize() {
    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
    };
  }
}
