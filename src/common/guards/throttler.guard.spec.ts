/* eslint-disable @typescript-eslint/unbound-method */
import { ExecutionContext, Logger } from '@nestjs/common';
import { CustomThrottlerGuard } from './throttle.guard';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  const createMockExecutionContext = (request: any): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn().mockReturnValue('http'),
    } as any;
  };

  beforeEach(() => {
    guard = new CustomThrottlerGuard(
      {
        ttl: 60,
        limit: 10,
      } as any,
      {} as any,
      {} as any,
    );

    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    describe('Login Path Tracking', () => {
      it('should track login attempts with IP and email', async () => {
        const request = {
          path: '/auth/login',
          body: { email: 'test@example.com' },
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('login:192.168.1.100:test@example.com');
      });

      it('should log warning for login attempts', async () => {
        const request = {
          path: '/auth/login',
          body: { email: 'test@example.com' },
          headers: {
            'x-forwarded-for': '192.168.1.100',
            'user-agent': 'Mozilla/5.0',
          },
        };
        const context = createMockExecutionContext(request);

        await guard['getTracker'](context);

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          'Login attempt from IP: 192.168.1.100, User Agent: Mozilla/5.0',
        );
      });

      it('should handle login path with url property', async () => {
        const request = {
          url: '/auth/login',
          body: { email: 'user@test.com' },
          headers: { 'x-real-ip': '10.0.0.1' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('login:10.0.0.1:user@test.com');
      });

      it('should use "unknown" for missing email in login', async () => {
        const request = {
          path: '/auth/login',
          body: {},
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('login:192.168.1.100:unknown');
      });

      it('should use "unknown" for missing body in login', async () => {
        const request = {
          path: '/auth/login',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('login:192.168.1.100:unknown');
      });

      it('should use "unknown" user agent when not provided', async () => {
        const request = {
          path: '/auth/login',
          body: { email: 'test@example.com' },
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        await guard['getTracker'](context);

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          'Login attempt from IP: 192.168.1.100, User Agent: unknown',
        );
      });

      it('should detect login path with partial match', async () => {
        const request = {
          path: '/api/v1/auth/login',
          body: { email: 'admin@example.com' },
          headers: { 'x-forwarded-for': '203.0.113.1' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('login:203.0.113.1:admin@example.com');
      });
    });

    describe('Authenticated User Tracking', () => {
      it('should track by user ID when user is authenticated', async () => {
        const request = {
          path: '/api/profile',
          user: { id: '550e8400-e29b-41d4-a716-446655440000' },
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('user:550e8400-e29b-41d4-a716-446655440000');
      });

      it('should prefer user tracking over IP tracking', async () => {
        const request = {
          path: '/api/data',
          user: { id: 'user-123' },
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('user:user-123');
        expect(result).not.toContain('ip:');
      });

      it('should handle numeric user IDs', async () => {
        const request = {
          path: '/api/resource',
          user: { id: 12345 },
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('user:12345');
      });
    });

    describe('IP-Based Tracking', () => {
      it('should track by IP for anonymous users', async () => {
        const request = {
          path: '/api/public',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.100');
      });

      it('should extract IP from x-forwarded-for header', async () => {
        const request = {
          path: '/api/test',
          headers: { 'x-forwarded-for': '203.0.113.195' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:203.0.113.195');
      });

      it('should handle multiple IPs in x-forwarded-for', async () => {
        const request = {
          path: '/api/test',
          headers: {
            'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
          },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:203.0.113.195');
      });

      it('should trim whitespace from x-forwarded-for IP', async () => {
        const request = {
          path: '/api/test',
          headers: { 'x-forwarded-for': '  192.168.1.100  , 10.0.0.1' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.100');
      });

      it('should fallback to x-real-ip header', async () => {
        const request = {
          path: '/api/test',
          headers: { 'x-real-ip': '10.0.0.50' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:10.0.0.50');
      });

      it('should fallback to connection.remoteAddress', async () => {
        const request = {
          path: '/api/test',
          connection: { remoteAddress: '172.16.0.1' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:172.16.0.1');
      });

      it('should fallback to socket.remoteAddress', async () => {
        const request = {
          path: '/api/test',
          socket: { remoteAddress: '192.168.100.50' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.100.50');
      });

      it('should fallback to request.ip', async () => {
        const request = {
          path: '/api/test',
          ip: '198.51.100.42',
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:198.51.100.42');
      });

      it('should use "unknown" when no IP can be determined', async () => {
        const request = {
          path: '/api/test',
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:unknown');
      });

      it('should prefer x-forwarded-for over other sources', async () => {
        const request = {
          path: '/api/test',
          headers: {
            'x-forwarded-for': '203.0.113.1',
            'x-real-ip': '192.168.1.1',
          },
          connection: { remoteAddress: '10.0.0.1' },
          ip: '172.16.0.1',
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:203.0.113.1');
      });
    });

    describe('Error Handling', () => {
      it('should handle non-HTTP context gracefully', async () => {
        const context = {
          switchToHttp: jest.fn().mockImplementation(() => {
            throw new Error('Not an HTTP context');
          }),
          getType: jest.fn().mockReturnValue('ws'),
        } as any;

        const result = await guard['getTracker'](context);

        expect(result).toBe('non-http-context');
        expect(loggerDebugSpy).toHaveBeenCalledWith(
          'Non-HTTP context, skipping tracker',
        );
      });

      it('should handle missing request object', async () => {
        const context = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockImplementation(() => {
              throw new Error('Request not available');
            }),
          }),
        } as any;

        const result = await guard['getTracker'](context);

        expect(result).toBe('non-http-context');
      });

      it('should handle undefined path and url', async () => {
        const request = {
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.100');
      });

      it('should handle null headers gracefully', async () => {
        const request = {
          path: '/api/test',
          headers: null,
          ip: '192.168.1.1',
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.1');
      });

      it('should handle undefined headers gracefully', async () => {
        const request = {
          path: '/api/test',
          ip: '192.168.1.1',
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.1');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty string path', async () => {
        const request = {
          path: '',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.100');
      });

      it('should handle path without login', async () => {
        const request = {
          path: '/api/users',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.100');
      });

      it('should handle user object without id', async () => {
        const request = {
          path: '/api/test',
          user: { email: 'test@example.com' },
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.100');
      });

      it('should handle empty user object', async () => {
        const request = {
          path: '/api/test',
          user: {},
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.100');
      });

      it('should handle IPv6 addresses', async () => {
        const request = {
          path: '/api/test',
          headers: {
            'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      });

      it('should handle localhost IPv4', async () => {
        const request = {
          path: '/api/test',
          headers: { 'x-forwarded-for': '127.0.0.1' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:127.0.0.1');
      });

      it('should handle localhost IPv6', async () => {
        const request = {
          path: '/api/test',
          headers: { 'x-forwarded-for': '::1' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:::1');
      });
    });

    describe('Priority Order', () => {
      it('should prioritize login tracking over user tracking', async () => {
        const request = {
          path: '/auth/login',
          body: { email: 'test@example.com' },
          user: { id: 'user-123' },
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('login:192.168.1.100:test@example.com');
      });

      it('should prioritize user tracking over IP tracking', async () => {
        const request = {
          path: '/api/resource',
          user: { id: 'user-456' },
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('user:user-456');
      });

      it('should use IP tracking as last resort', async () => {
        const request = {
          path: '/api/public',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);

        const result = await guard['getTracker'](context);

        expect(result).toBe('ip:192.168.1.100');
      });
    });

    describe('getClientIP method', () => {
      it('should be called when extracting IP', async () => {
        const request = {
          path: '/api/test',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        };
        const context = createMockExecutionContext(request);
        const getClientIPSpy = jest.spyOn(guard as any, 'getClientIP');

        await guard['getTracker'](context);

        expect(getClientIPSpy).toHaveBeenCalledWith(request);
      });

      it('should handle all fallback scenarios in correct order', () => {
        const testCases = [
          {
            request: { headers: { 'x-forwarded-for': '1.1.1.1' } },
            expected: '1.1.1.1',
          },
          {
            request: { headers: { 'x-real-ip': '2.2.2.2' } },
            expected: '2.2.2.2',
          },
          {
            request: { connection: { remoteAddress: '3.3.3.3' } },
            expected: '3.3.3.3',
          },
          {
            request: { socket: { remoteAddress: '4.4.4.4' } },
            expected: '4.4.4.4',
          },
          {
            request: { ip: '5.5.5.5' },
            expected: '5.5.5.5',
          },
          {
            request: {},
            expected: 'unknown',
          },
        ];

        for (const testCase of testCases) {
          const ip = guard['getClientIP'](testCase.request);
          expect(ip).toBe(testCase.expected);
        }
      });
    });
  });
});
