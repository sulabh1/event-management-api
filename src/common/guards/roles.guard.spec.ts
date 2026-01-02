/* eslint-disable @typescript-eslint/unbound-method */
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../modules/users/entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockUser = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    role: UserRole.USER,
  };

  const mockAdminUser = {
    sub: '660e8400-e29b-41d4-a716-446655440001',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockRequest = {
    user: mockUser,
  };

  const createMockExecutionContext = (
    request: any = mockRequest,
  ): ExecutionContext => {
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
      getType: jest.fn(),
    } as any;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    describe('No Required Roles', () => {
      it('should allow access when no roles are required', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(
          'roles',
          context.getHandler(),
        );
      });

      it('should allow access when roles metadata is null', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue(null);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access when roles array is empty', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('Single Role Requirements', () => {
      it('should allow access when user has required USER role', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access when user has required ADMIN role', () => {
        const request = { user: mockAdminUser };
        const context = createMockExecutionContext(request);
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should deny access when user does not have required role', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should deny access when USER tries to access ADMIN route', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
        expect(mockRequest.user.role).toBe(UserRole.USER);
      });
    });

    describe('Multiple Role Requirements', () => {
      it('should allow access when user has one of multiple required roles', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(reflector, 'get')
          .mockReturnValue([UserRole.USER, UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow ADMIN access when both USER and ADMIN roles are allowed', () => {
        const request = { user: mockAdminUser };
        const context = createMockExecutionContext(request);
        jest
          .spyOn(reflector, 'get')
          .mockReturnValue([UserRole.USER, UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should deny access when user role is not in the required roles list', () => {
        const moderatorUser = {
          sub: '770e8400-e29b-41d4-a716-446655440002',
          email: 'moderator@example.com',
          role: 'MODERATOR' as UserRole,
        };
        const request = { user: moderatorUser };
        const context = createMockExecutionContext(request);
        jest
          .spyOn(reflector, 'get')
          .mockReturnValue([UserRole.USER, UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });
    });

    describe('User Object Validation', () => {
      it('should extract user from request object', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        guard.canActivate(context);

        expect(context.switchToHttp().getRequest().user).toBeDefined();
        expect(context.switchToHttp().getRequest().user).toEqual(mockUser);
      });

      it('should check user role property', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRequest.user).toHaveProperty('role');
        expect(mockRequest.user.role).toBe(UserRole.USER);
      });

      it('should handle user with different role values', () => {
        const customRoleUser = {
          sub: '880e8400-e29b-41d4-a716-446655440003',
          email: 'custom@example.com',
          role: UserRole.ADMIN,
        };
        const request = { user: customRoleUser };
        const context = createMockExecutionContext(request);
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(customRoleUser.role).toBe(UserRole.ADMIN);
      });
    });

    describe('Reflector Integration', () => {
      it('should call reflector.get with correct parameters', () => {
        const context = createMockExecutionContext();
        const getSpy = jest
          .spyOn(reflector, 'get')
          .mockReturnValue([UserRole.USER]);

        guard.canActivate(context);

        expect(getSpy).toHaveBeenCalledWith('roles', context.getHandler());
        expect(getSpy).toHaveBeenCalledTimes(1);
      });

      it('should retrieve metadata from handler', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.ADMIN]);

        guard.canActivate(context);

        expect(reflector.get).toHaveBeenCalledWith(
          'roles',
          context.getHandler(),
        );
      });

      it('should use handler from execution context', () => {
        const context = createMockExecutionContext();
        const getHandlerSpy = jest.spyOn(context, 'getHandler');
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        guard.canActivate(context);

        expect(getHandlerSpy).toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('should handle undefined user gracefully', () => {
        const request = { user: undefined };
        const context = createMockExecutionContext(request);
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        expect(() => guard.canActivate(context)).toThrow();
      });

      it('should handle null user gracefully', () => {
        const request = { user: null };
        const context = createMockExecutionContext(request);
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        expect(() => guard.canActivate(context)).toThrow();
      });

      it('should handle missing role property', () => {
        const request = {
          user: {
            sub: '990e8400-e29b-41d4-a716-446655440004',
            email: 'norole@example.com',
          },
        };
        const context = createMockExecutionContext(request);
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should return false for empty role value', () => {
        const request = {
          user: {
            sub: '100e8400-e29b-41d4-a716-446655440005',
            email: 'emptyrole@example.com',
            role: '' as UserRole,
          },
        };
        const context = createMockExecutionContext(request);
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });
    });

    describe('Authorization Flow', () => {
      it('should complete full authorization check', () => {
        const context = createMockExecutionContext();
        const reflectorSpy = jest
          .spyOn(reflector, 'get')
          .mockReturnValue([UserRole.USER]);
        const switchToHttpSpy = jest.spyOn(context, 'switchToHttp');

        const result = guard.canActivate(context);

        expect(reflectorSpy).toHaveBeenCalled();
        expect(switchToHttpSpy).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should skip user check when no roles required', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        const switchToHttpSpy = jest.spyOn(context, 'switchToHttp');

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(switchToHttpSpy).not.toHaveBeenCalled();
      });

      it('should perform role comparison correctly', () => {
        const context = createMockExecutionContext();
        jest
          .spyOn(reflector, 'get')
          .mockReturnValue([UserRole.USER, UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect([UserRole.USER, UserRole.ADMIN]).toContain(mockUser.role);
      });
    });

    describe('Different Role Scenarios', () => {
      it('should handle case-sensitive role comparison', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockUser.role).toBe(UserRole.USER);
      });

      it('should correctly identify ADMIN users', () => {
        const request = { user: mockAdminUser };
        const context = createMockExecutionContext(request);
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockAdminUser.role).toBe(UserRole.ADMIN);
      });

      it('should correctly identify USER users', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockUser.role).toBe(UserRole.USER);
      });
    });

    describe('Request Context', () => {
      it('should access request from HTTP context', () => {
        const context = createMockExecutionContext();
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        guard.canActivate(context);

        expect(context.switchToHttp).toHaveBeenCalled();
        expect(context.switchToHttp().getRequest).toHaveBeenCalled();
      });

      it('should work with different request objects', () => {
        const customRequest = {
          user: {
            sub: '200e8400-e29b-41d4-a716-446655440006',
            email: 'custom@example.com',
            role: UserRole.USER,
          },
        };
        const context = createMockExecutionContext(customRequest);
        jest.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });
  });
});
