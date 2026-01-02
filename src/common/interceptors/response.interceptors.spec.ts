/* eslint-disable @typescript-eslint/unbound-method */
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  const createMockExecutionContext = (
    request: any = {},
    response: any = {},
  ): ExecutionContext => {
    const mockResponse = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      ...response,
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue(mockResponse),
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
    interceptor = new ResponseInterceptor();

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
    describe('Response Structure', () => {
      it('should transform response with correct structure', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        const mockData = { id: 1, name: 'Test' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(mockData));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response).toHaveProperty('success');
            expect(response).toHaveProperty('data');
            expect(response).toHaveProperty('message');
            expect(response).toHaveProperty('timestamp');
            expect(response).toHaveProperty('requestId');
            done();
          },
        });
      });

      it('should set success to true', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest
          .fn()
          .mockReturnValue(of({ test: 'data' }));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.success).toBe(true);
            done();
          },
        });
      });

      it('should include original data in response', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        const originalData = { id: 123, title: 'Event' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(originalData));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toEqual(originalData);
            done();
          },
        });
      });

      it('should include timestamp in ISO format', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.timestamp).toBeDefined();
            expect(() => new Date(response.timestamp)).not.toThrow();
            expect(response.timestamp).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
            );
            done();
          },
        });
      });
    });

    describe('HTTP Method Messages', () => {
      it('should return correct message for GET request', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.message).toBe('Request successful');
            done();
          },
        });
      });

      it('should return correct message for POST request', (done) => {
        const request = { method: 'POST' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({ id: 1 }));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.message).toBe('Created successfully');
            done();
          },
        });
      });

      it('should return correct message for PUT request', (done) => {
        const request = { method: 'PUT' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.message).toBe('Updated successfully');
            done();
          },
        });
      });

      it('should return correct message for PATCH request', (done) => {
        const request = { method: 'PATCH' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.message).toBe('Updated successfully');
            done();
          },
        });
      });

      it('should return correct message for DELETE request', (done) => {
        const request = { method: 'DELETE' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.message).toBe('Deleted successfully');
            done();
          },
        });
      });

      it('should return default message for unknown method', (done) => {
        const request = { method: 'OPTIONS' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.message).toBe('Request successful');
            done();
          },
        });
      });

      it('should handle HEAD method', (done) => {
        const request = { method: 'HEAD' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.message).toBe('Request successful');
            done();
          },
        });
      });
    });

    describe('Request ID Handling', () => {
      it('should include request ID when present', (done) => {
        const requestId = 'req-123-456-789';
        const request = { method: 'GET', id: requestId };
        const mockResponse = {
          setHeader: jest.fn(),
          getHeader: jest.fn(),
        };
        mockExecutionContext = createMockExecutionContext(
          request,
          mockResponse,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.requestId).toBe(requestId);
            done();
          },
        });
      });

      it('should set X-Request-ID header when request has id', (done) => {
        const requestId = 'req-abc-def';
        const request = { method: 'GET', id: requestId };
        const mockResponse = {
          setHeader: jest.fn(),
          getHeader: jest.fn(),
        };
        mockExecutionContext = createMockExecutionContext(
          request,
          mockResponse,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-Request-ID',
              requestId,
            );
            done();
          },
        });
      });

      it('should handle missing request ID', (done) => {
        const request = { method: 'GET' };
        const mockResponse = {
          setHeader: jest.fn(),
          getHeader: jest.fn(),
        };
        mockExecutionContext = createMockExecutionContext(
          request,
          mockResponse,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.requestId).toBeUndefined();
            expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
              'X-Request-ID',
              expect.anything(),
            );
            done();
          },
        });
      });

      it('should handle null request ID', (done) => {
        const request = { method: 'GET', id: null };
        const mockResponse = {
          setHeader: jest.fn(),
          getHeader: jest.fn(),
        };
        mockExecutionContext = createMockExecutionContext(
          request,
          mockResponse,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.requestId).toBeNull();
            done();
          },
        });
      });
    });

    describe('Rate Limit Headers', () => {
      it('should set rate limit headers when present', (done) => {
        const request = { method: 'GET' };
        const mockResponse = {
          setHeader: jest.fn(),
          getHeader: jest.fn((header: string) => {
            if (header === 'X-RateLimit-Remaining') return '99';
            if (header === 'X-RateLimit-Limit') return '100';
            if (header === 'X-RateLimit-Reset') return '1640000000';
            return undefined;
          }),
        };
        mockExecutionContext = createMockExecutionContext(
          request,
          mockResponse,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-RateLimit-Remaining',
              '99',
            );
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-RateLimit-Limit',
              '100',
            );
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-RateLimit-Reset',
              '1640000000',
            );
            done();
          },
        });
      });

      it('should not set rate limit headers when not present', (done) => {
        const request = { method: 'GET' };
        const mockResponse = {
          setHeader: jest.fn(),
          getHeader: jest.fn(() => undefined),
        };
        mockExecutionContext = createMockExecutionContext(
          request,
          mockResponse,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
              'X-RateLimit-Remaining',
              expect.anything(),
            );
            expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
              'X-RateLimit-Limit',
              expect.anything(),
            );
            expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
              'X-RateLimit-Reset',
              expect.anything(),
            );
            done();
          },
        });
      });

      it('should handle rate limit remaining as 0', (done) => {
        const request = { method: 'GET' };
        const mockResponse = {
          setHeader: jest.fn(),
          getHeader: jest.fn((header: string) => {
            if (header === 'X-RateLimit-Remaining') return '0';
            if (header === 'X-RateLimit-Limit') return '100';
            if (header === 'X-RateLimit-Reset') return '1640000000';
            return undefined;
          }),
        };
        mockExecutionContext = createMockExecutionContext(
          request,
          mockResponse,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-RateLimit-Remaining',
              '0',
            );
            done();
          },
        });
      });

      it('should check for X-RateLimit-Remaining header', (done) => {
        const request = { method: 'GET' };
        const mockResponse = {
          setHeader: jest.fn(),
          getHeader: jest.fn(),
        };
        mockExecutionContext = createMockExecutionContext(
          request,
          mockResponse,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            expect(mockResponse.getHeader).toHaveBeenCalledWith(
              'X-RateLimit-Remaining',
            );
            done();
          },
        });
      });
    });

    describe('Different Data Types', () => {
      it('should handle object data', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        const objectData = { id: 1, name: 'Test', active: true };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(objectData));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toEqual(objectData);
            expect(typeof response.data).toBe('object');
            done();
          },
        });
      });

      it('should handle array data', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        const arrayData = [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ];
        mockCallHandler.handle = jest.fn().mockReturnValue(of(arrayData));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toEqual(arrayData);
            expect(Array.isArray(response.data)).toBe(true);
            done();
          },
        });
      });

      it('should handle null data', (done) => {
        const request = { method: 'DELETE' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toBeNull();
            expect(response.success).toBe(true);
            done();
          },
        });
      });

      it('should handle undefined data', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of(undefined));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toBeUndefined();
            expect(response.success).toBe(true);
            done();
          },
        });
      });

      it('should handle string data', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        const stringData = 'Hello World';
        mockCallHandler.handle = jest.fn().mockReturnValue(of(stringData));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toBe(stringData);
            done();
          },
        });
      });

      it('should handle number data', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        const numberData = 42;
        mockCallHandler.handle = jest.fn().mockReturnValue(of(numberData));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toBe(numberData);
            done();
          },
        });
      });

      it('should handle boolean data', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of(true));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toBe(true);
            done();
          },
        });
      });

      it('should handle empty object', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toEqual({});
            done();
          },
        });
      });

      it('should handle empty array', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of([]));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toEqual([]);
            done();
          },
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle request without method', (done) => {
        const request = {};
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.message).toBe('Request successful');
            done();
          },
        });
      });

      it('should handle numeric request ID', (done) => {
        const request = { method: 'GET', id: 12345 };
        const mockResponse = {
          setHeader: jest.fn(),
          getHeader: jest.fn(),
        };
        mockExecutionContext = createMockExecutionContext(
          request,
          mockResponse,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.requestId).toBe(12345);
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-Request-ID',
              12345,
            );
            done();
          },
        });
      });

      it('should handle very large data objects', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        const largeData = {
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
          })),
        };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(largeData));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toEqual(largeData);
            expect(response.data.items.length).toBe(1000);
            done();
          },
        });
      });

      it('should handle nested objects', (done) => {
        const request = { method: 'POST' };
        mockExecutionContext = createMockExecutionContext(request);
        const nestedData = {
          user: {
            id: 1,
            profile: {
              name: 'John',
              address: {
                city: 'New York',
                country: 'USA',
              },
            },
          },
        };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(nestedData));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: (response) => {
            expect(response.data).toEqual(nestedData);
            expect(response.data.user.profile.address.city).toBe('New York');
            done();
          },
        });
      });
    });

    describe('CallHandler Integration', () => {
      it('should call handle on CallHandler', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);
            done();
          },
        });
      });

      it('should not call handle multiple times', (done) => {
        const request = { method: 'GET' };
        mockExecutionContext = createMockExecutionContext(request);
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);
            done();
          },
        });
      });
    });
  });

  describe('getMessage', () => {
    it('should be a private method', () => {
      expect(typeof (interceptor as any).getMessage).toBe('function');
    });

    it('should return correct messages for all methods', () => {
      expect((interceptor as any).getMessage('GET')).toBe('Request successful');
      expect((interceptor as any).getMessage('POST')).toBe(
        'Created successfully',
      );
      expect((interceptor as any).getMessage('PUT')).toBe(
        'Updated successfully',
      );
      expect((interceptor as any).getMessage('PATCH')).toBe(
        'Updated successfully',
      );
      expect((interceptor as any).getMessage('DELETE')).toBe(
        'Deleted successfully',
      );
      expect((interceptor as any).getMessage('OPTIONS')).toBe(
        'Request successful',
      );
      expect((interceptor as any).getMessage('HEAD')).toBe(
        'Request successful',
      );
      expect((interceptor as any).getMessage('')).toBe('Request successful');
      expect((interceptor as any).getMessage(undefined)).toBe(
        'Request successful',
      );
    });
  });
});
