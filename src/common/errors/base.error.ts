export abstract class BaseError extends Error {
  abstract statusCode: number;
  abstract errorCode: string;

  constructor(
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  abstract serialize(): {
    statusCode: number;
    errorCode: string;
    message: string;
    details?: any;
  };
}
