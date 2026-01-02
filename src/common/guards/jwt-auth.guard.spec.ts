/* eslint-disable @typescript-eslint/unbound-method */

import { ExecutionContext } from '@nestjs/common';
import { JWTAuthGuard } from './jwt-auth.guard';
import { JwtUtils } from '../utils/jwt.utils';
import { AuthenticationError } from '../errors/application.errors';

describe('JWTAuthGuard', () => {
  let guard: JWTAuthGuard;

  const mockPayload = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    role: 'user',
  };

  const mockRequest = {
    headers: {
      authorization: 'Bearer valid.jwt.token',
    },
    user: null,
  };

  const createMockExecutionContext = (
    request: any = mockRequest,
  ): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as any;
  };

  beforeEach(() => {
    guard = new JWTAuthGuard();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    describe('Success Cases', () => {
      it('should allow access with valid token', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockReturnValue(mockPayload);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(JwtUtils.extractTokenFromHeader).toHaveBeenCalledWith(
          'Bearer valid.jwt.token',
        );
        expect(JwtUtils.isTokenExpired).toHaveBeenCalledWith('valid.jwt.token');
        expect(JwtUtils.verifyToken).toHaveBeenCalledWith('valid.jwt.token');
      });

      it('should attach user payload to request object', () => {
        const request = { ...mockRequest, user: null };
        const context = createMockExecutionContext(request);
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockReturnValue(mockPayload);

        guard.canActivate(context);

        expect(request.user).toEqual(mockPayload);
      });

      it('should extract token from authorization header', () => {
        const context = createMockExecutionContext();
        const extractTokenSpy = jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockReturnValue(mockPayload);

        guard.canActivate(context);

        expect(extractTokenSpy).toHaveBeenCalledWith(
          mockRequest.headers.authorization,
        );
      });

      it('should verify token is not expired', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        const isExpiredSpy = jest
          .spyOn(JwtUtils, 'isTokenExpired')
          .mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockReturnValue(mockPayload);

        guard.canActivate(context);

        expect(isExpiredSpy).toHaveBeenCalledWith('valid.jwt.token');
      });

      it('should verify token signature', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        const verifySpy = jest
          .spyOn(JwtUtils, 'verifyToken')
          .mockReturnValue(mockPayload);

        guard.canActivate(context);

        expect(verifySpy).toHaveBeenCalledWith('valid.jwt.token');
      });
    });

    describe('Failure Cases - No Authorization Header', () => {
      it('should return false when authorization header is missing', () => {
        const requestWithoutAuth = {
          headers: {},
          user: null,
        };
        const context = createMockExecutionContext(requestWithoutAuth);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should handle missing authorization header gracefully', () => {
        const requestWithoutAuth = {
          headers: {},
          user: null,
        };
        const context = createMockExecutionContext(requestWithoutAuth);

        expect(() => guard.canActivate(context)).not.toThrow();
      });
    });

    describe('Failure Cases - Invalid Token', () => {
      it('should return false when token cannot be extracted', () => {
        const context = createMockExecutionContext();
        jest.spyOn(JwtUtils, 'extractTokenFromHeader').mockReturnValue(null);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should return false when token is malformed', () => {
        const requestWithMalformedToken = {
          headers: {
            authorization: 'InvalidFormat',
          },
          user: null,
        };
        const context = createMockExecutionContext(requestWithMalformedToken);
        jest.spyOn(JwtUtils, 'extractTokenFromHeader').mockReturnValue(null);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should handle null token extraction gracefully', () => {
        const context = createMockExecutionContext();
        jest.spyOn(JwtUtils, 'extractTokenFromHeader').mockReturnValue(null);

        expect(() => guard.canActivate(context)).not.toThrow();
      });
    });

    describe('Failure Cases - Expired Token', () => {
      it('should return false when token is expired', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('expired.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(true);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
        expect(JwtUtils.isTokenExpired).toHaveBeenCalledWith(
          'expired.jwt.token',
        );
      });

      it('should not verify expired token', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('expired.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(true);
        const verifySpy = jest.spyOn(JwtUtils, 'verifyToken');

        guard.canActivate(context);

        expect(verifySpy).not.toHaveBeenCalled();
      });

      it('should handle expired token gracefully', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('expired.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(true);

        expect(() => guard.canActivate(context)).not.toThrow();
      });
    });

    describe('Failure Cases - Invalid Signature', () => {
      it('should return false when token verification fails', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('invalid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should handle verification errors gracefully', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('invalid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        expect(() => guard.canActivate(context)).not.toThrow();
      });
    });

    describe('Different Token Formats', () => {
      it('should handle Bearer token format', () => {
        const requestWithBearer = {
          headers: {
            authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          user: null,
        };
        const context = createMockExecutionContext(requestWithBearer);
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockReturnValue(mockPayload);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should handle authorization header case-insensitively', () => {
        const requestWithLowerCase = {
          headers: {
            authorization: 'bearer valid.jwt.token',
          },
          user: null,
        };
        const context = createMockExecutionContext(requestWithLowerCase);
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockReturnValue(mockPayload);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('User Payload', () => {
      it('should attach payload with correct structure', () => {
        const request = { ...mockRequest, user: null };
        const context = createMockExecutionContext(request);
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockReturnValue(mockPayload);

        guard.canActivate(context);

        expect(request.user).toHaveProperty('sub');
        expect(request.user).toHaveProperty('email');
        expect(request.user).toHaveProperty('role');
      });

      it('should attach admin user payload', () => {
        const adminPayload = {
          sub: '660e8400-e29b-41d4-a716-446655440001',
          email: 'admin@example.com',
          role: 'admin',
        };
        const request = { ...mockRequest, user: null };
        const context = createMockExecutionContext(request);
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockReturnValue(adminPayload);

        guard.canActivate(context);

        expect(request.user).not.toBeNull();
        expect(request.user).toMatchObject(adminPayload);
        expect((request.user as unknown as { role: string }).role).toBe(
          'admin',
        );
      });

      it('should return false when unexpected error occurs', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockImplementation(() => {
            throw new Error('Unexpected error');
          });

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should handle any exception gracefully', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockImplementation(() => {
            throw new Error('Database error');
          });

        expect(() => guard.canActivate(context)).not.toThrow();
      });

      it('should catch AuthenticationError', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockImplementation(() => {
            throw new AuthenticationError('Custom auth error');
          });

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });
    });
    describe('Integration Flow', () => {
      it('should execute all validation steps', () => {
        const context = createMockExecutionContext();
        const extractSpy = jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        const expiredSpy = jest
          .spyOn(JwtUtils, 'isTokenExpired')
          .mockReturnValue(false);
        const verifySpy = jest
          .spyOn(JwtUtils, 'verifyToken')
          .mockReturnValue(mockPayload);

        guard.canActivate(context);

        expect(extractSpy).toHaveBeenCalled();
        expect(expiredSpy).toHaveBeenCalled();
        expect(verifySpy).toHaveBeenCalled();
        expect(extractSpy).toHaveBeenCalledWith('Bearer valid.jwt.token');
        expect(expiredSpy).toHaveBeenCalledWith('valid.jwt.token');
        expect(verifySpy).toHaveBeenCalledWith('valid.jwt.token');
      });

      it('should not verify if token extraction fails', () => {
        const context = createMockExecutionContext();
        jest.spyOn(JwtUtils, 'extractTokenFromHeader').mockReturnValue(null);
        const expiredSpy = jest.spyOn(JwtUtils, 'isTokenExpired');
        const verifySpy = jest.spyOn(JwtUtils, 'verifyToken');

        guard.canActivate(context);

        expect(expiredSpy).not.toHaveBeenCalled();
        expect(verifySpy).not.toHaveBeenCalled();
      });

      it('should not verify if token is expired', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('expired.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(true);
        const verifySpy = jest.spyOn(JwtUtils, 'verifyToken');

        guard.canActivate(context);

        expect(verifySpy).not.toHaveBeenCalled();
      });

      it('should complete full validation flow on success', () => {
        const request = { ...mockRequest, user: null };
        const context = createMockExecutionContext(request);
        jest
          .spyOn(JwtUtils, 'extractTokenFromHeader')
          .mockReturnValue('valid.jwt.token');
        jest.spyOn(JwtUtils, 'isTokenExpired').mockReturnValue(false);
        jest.spyOn(JwtUtils, 'verifyToken').mockReturnValue(mockPayload);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(request.user).toEqual(mockPayload);
      });
    });
  });
});
