/* eslint-disable @typescript-eslint/unbound-method */
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptors';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const createMockExecutionContext = (
    request: any = {},
    response: any = {},
  ): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue(response),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as any;
  };

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

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

  describe('intercept - Successful Requests', () => {
    it('should log successful GET request with all details', (done) => {
      const request = {
        method: 'GET',
        url: '/api/users',
        ip: '192.168.1.100',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ data: 'test' }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(loggerLogSpy).toHaveBeenCalledTimes(1);
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('GET');
          expect(logMessage).toContain('/api/users');
          expect(logMessage).toContain('200');
          expect(logMessage).toContain('ms');
          expect(logMessage).toContain('192.168.1.100');
          done();
        },
      });
    });

    it('should log successful POST request', (done) => {
      const request = {
        method: 'POST',
        url: '/api/events',
        ip: '10.0.0.1',
      };
      const response = { statusCode: 201 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ id: 1 }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(loggerLogSpy).toHaveBeenCalledTimes(1);
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('POST');
          expect(logMessage).toContain('/api/events');
          expect(logMessage).toContain('201');
          expect(logMessage).toContain('10.0.0.1');
          done();
        },
      });
    });

    it('should log successful PUT request', (done) => {
      const request = {
        method: 'PUT',
        url: '/api/users/123',
        ip: '172.16.0.1',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('PUT');
          expect(logMessage).toContain('/api/users/123');
          done();
        },
      });
    });

    it('should log successful DELETE request', (done) => {
      const request = {
        method: 'DELETE',
        url: '/api/users/456',
        ip: '203.0.113.1',
      };
      const response = { statusCode: 204 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('DELETE');
          expect(logMessage).toContain('204');
          done();
        },
      });
    });

    it('should calculate request duration', (done) => {
      const request = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('result'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toMatch(/\d+ms/);
          // Duration should be reasonable (less than 100ms for this test)
          const extractedDuration = parseInt(
            logMessage.match(/(\d+)ms/)?.[1] || '0',
          );
          expect(extractedDuration).toBeGreaterThanOrEqual(0);
          expect(extractedDuration).toBeLessThan(100);
          done();
        },
      });
    });

    it('should not call error logger on success', (done) => {
      const request = {
        method: 'GET',
        url: '/api/success',
        ip: '192.168.1.1',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(loggerErrorSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('intercept - Failed Requests', () => {
    it('should log error with status and message', (done) => {
      const request = {
        method: 'GET',
        url: '/api/error',
        ip: '192.168.1.100',
      };
      mockExecutionContext = createMockExecutionContext(request, {});
      const error = { status: 404, message: 'Not Found' };
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
          const errorMessage = loggerErrorSpy.mock.calls[0][0];
          expect(errorMessage).toContain('GET');
          expect(errorMessage).toContain('/api/error');
          expect(errorMessage).toContain('404');
          expect(errorMessage).toContain('Not Found');
          expect(errorMessage).toContain('192.168.1.100');
          expect(errorMessage).toContain('ms');
          done();
        },
      });
    });

    it('should log error with default status 500', (done) => {
      const request = {
        method: 'POST',
        url: '/api/crash',
        ip: '10.0.0.1',
      };
      mockExecutionContext = createMockExecutionContext(request, {});
      const error = { message: 'Internal Server Error' };
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const errorMessage = loggerErrorSpy.mock.calls[0][0];
          expect(errorMessage).toContain('500');
          expect(errorMessage).toContain('Internal Server Error');
          done();
        },
      });
    });

    it('should handle Error instances', (done) => {
      const request = {
        method: 'GET',
        url: '/api/error',
        ip: '192.168.1.1',
      };
      mockExecutionContext = createMockExecutionContext(request, {});
      const error = new Error('Something went wrong');
      (error as any).status = 500;
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const errorMessage = loggerErrorSpy.mock.calls[0][0];
          expect(errorMessage).toContain('500');
          expect(errorMessage).toContain('Something went wrong');
          done();
        },
      });
    });

    it('should handle string errors', (done) => {
      const request = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
      };
      mockExecutionContext = createMockExecutionContext(request, {});
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => 'String error'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const errorMessage = loggerErrorSpy.mock.calls[0][0];
          expect(errorMessage).toContain('500');
          expect(errorMessage).toContain('String error');
          done();
        },
      });
    });

    it('should handle null error', (done) => {
      const request = {
        method: 'GET',
        url: '/api/null',
        ip: '192.168.1.1',
      };
      mockExecutionContext = createMockExecutionContext(request, {});
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const errorMessage = loggerErrorSpy.mock.calls[0][0];
          expect(errorMessage).toContain('500');
          expect(errorMessage).toContain('null');
          done();
        },
      });
    });

    it('should handle undefined error', (done) => {
      const request = {
        method: 'GET',
        url: '/api/undefined',
        ip: '192.168.1.1',
      };
      mockExecutionContext = createMockExecutionContext(request, {});
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => undefined));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const errorMessage = loggerErrorSpy.mock.calls[0][0];
          expect(errorMessage).toContain('500');
          expect(errorMessage).toContain('undefined');
          done();
        },
      });
    });

    it('should calculate duration for failed requests', (done) => {
      const request = {
        method: 'GET',
        url: '/api/error',
        ip: '192.168.1.1',
      };
      mockExecutionContext = createMockExecutionContext(request, {});
      const error = { status: 400, message: 'Bad Request' };
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const errorMessage = loggerErrorSpy.mock.calls[0][0];
          expect(errorMessage).toMatch(/\d+ms/);
          done();
        },
      });
    });

    it('should not call success logger on error', (done) => {
      const request = {
        method: 'GET',
        url: '/api/error',
        ip: '192.168.1.1',
      };
      mockExecutionContext = createMockExecutionContext(request, {});
      const error = new Error('Test error');
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(loggerLogSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('Default Values and Fallbacks', () => {
    it('should use UNKNOWN_METHOD when method is missing', (done) => {
      const request = {
        url: '/api/test',
        ip: '192.168.1.1',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('result'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('UNKNOWN_METHOD');
          done();
        },
      });
    });

    it('should use UNKNOWN_URL when url is missing', (done) => {
      const request = {
        method: 'GET',
        ip: '192.168.1.1',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('result'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('UNKNOWN_URL');
          done();
        },
      });
    });

    it('should use UNKNOWN_IP when ip is missing', (done) => {
      const request = {
        method: 'GET',
        url: '/api/test',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('result'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('UNKNOWN_IP');
          done();
        },
      });
    });

    it('should use default status code 200 when missing', (done) => {
      const request = {
        method: 'GET',
        url: '/api/test',
        ip: '192.168.1.1',
      };
      const response = {};
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('result'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('200');
          done();
        },
      });
    });

    it('should handle all missing properties', (done) => {
      const request = {};
      const response = {};
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('result'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('UNKNOWN_METHOD');
          expect(logMessage).toContain('UNKNOWN_URL');
          expect(logMessage).toContain('UNKNOWN_IP');
          expect(logMessage).toContain('200');
          done();
        },
      });
    });
  });

  describe('Different HTTP Methods and Status Codes', () => {
    it('should log PATCH request', (done) => {
      const request = {
        method: 'PATCH',
        url: '/api/users/1',
        ip: '192.168.1.1',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('PATCH');
          done();
        },
      });
    });

    it('should log OPTIONS request', (done) => {
      const request = {
        method: 'OPTIONS',
        url: '/api/test',
        ip: '192.168.1.1',
      };
      const response = { statusCode: 204 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('OPTIONS');
          expect(logMessage).toContain('204');
          done();
        },
      });
    });

    it('should handle custom status codes', (done) => {
      const request = {
        method: 'GET',
        url: '/api/test',
        ip: '192.168.1.1',
      };
      const response = { statusCode: 418 }; // I'm a teapot
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('teapot'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('418');
          done();
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long URLs', (done) => {
      const longUrl = '/api/' + 'a'.repeat(1000);
      const request = {
        method: 'GET',
        url: longUrl,
        ip: '192.168.1.1',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('result'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain(longUrl);
          done();
        },
      });
    });

    it('should handle URLs with query parameters', (done) => {
      const request = {
        method: 'GET',
        url: '/api/users?page=1&limit=10',
        ip: '192.168.1.1',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of([]));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain('/api/users?page=1&limit=10');
          done();
        },
      });
    });

    it('should handle IPv6 addresses', (done) => {
      const request = {
        method: 'GET',
        url: '/api/test',
        ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('result'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const logMessage = loggerLogSpy.mock.calls[0][0];
          expect(logMessage).toContain(
            '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          );
          done();
        },
      });
    });

    it('should handle error messages with special characters', (done) => {
      const request = {
        method: 'POST',
        url: '/api/test',
        ip: '192.168.1.1',
      };
      mockExecutionContext = createMockExecutionContext(request, {});
      const error = {
        status: 400,
        message:
          'Invalid input: "test@example.com" & <script>alert("xss")</script>',
      };
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const errorMessage = loggerErrorSpy.mock.calls[0][0];
          expect(errorMessage).toContain('Invalid input');
          done();
        },
      });
    });
  });

  describe('CallHandler Integration', () => {
    it('should call handle on CallHandler', (done) => {
      const request = {
        method: 'GET',
        url: '/api/test',
        ip: '192.168.1.1',
      };
      const response = { statusCode: 200 };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of('result'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });

    it('should pass through response data unchanged', (done) => {
      const request = {
        method: 'GET',
        url: '/api/test',
        ip: '192.168.1.1',
      };
      const response = { statusCode: 200 };
      const mockData = { id: 1, name: 'Test' };
      mockExecutionContext = createMockExecutionContext(request, response);
      mockCallHandler.handle = jest.fn().mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual(mockData);
          done();
        },
      });
    });
  });
});
