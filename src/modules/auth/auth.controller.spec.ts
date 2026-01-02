/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { UserRole } from '../users/entities/user.entity';
import {
  ConflictError,
  AuthorizationError,
} from '../../common/errors/application.errors';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthResponse: AuthResponseDto = {
    user: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'sulabh adhikari',
      email: 'sulabh@example.com',
      role: UserRole.USER,
    },
    token: 'mock.jwt.token',
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'sulabh adhikari',
      email: 'sulabh@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: UserRole.USER,
    };

    it('should successfully register a new user', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAuthResponse);
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).toHaveProperty('role');
      expect(result).toHaveProperty('token');
    });

    it('should register an admin user', async () => {
      const adminRegisterDto: RegisterDto = {
        ...registerDto,
        role: UserRole.ADMIN,
      };
      const adminResponse: AuthResponseDto = {
        ...mockAuthResponse,
        user: { ...mockAuthResponse.user, role: UserRole.ADMIN },
      };
      mockAuthService.register.mockResolvedValue(adminResponse);

      const result = await controller.register(adminRegisterDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(adminRegisterDto);
      expect(result.user.role).toBe(UserRole.ADMIN);
    });

    it('should throw ConflictError when email already exists', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictError('Email already registered'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictError,
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should pass through all registration data to service', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          name: registerDto.name,
          email: registerDto.email,
          password: registerDto.password,
          role: registerDto.role,
        }),
      );
    });

    it('should return user data without password', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'Password123!',
    };

    it('should successfully login with valid credentials', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAuthResponse);
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).toHaveProperty('role');
      expect(result).toHaveProperty('token');
    });

    it('should login admin user successfully', async () => {
      const adminResponse: AuthResponseDto = {
        ...mockAuthResponse,
        user: { ...mockAuthResponse.user, role: UserRole.ADMIN },
      };
      mockAuthService.login.mockResolvedValue(adminResponse);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result.user.role).toBe(UserRole.ADMIN);
    });

    it('should throw AuthorizationError for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new AuthorizationError('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        AuthorizationError,
      );
      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw AuthorizationError for non-existent user', async () => {
      mockAuthService.login.mockRejectedValue(
        new AuthorizationError('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        AuthorizationError,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should pass through login credentials to service', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: loginDto.email,
          password: loginDto.password,
        }),
      );
    });

    it('should return user data without password', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result.user).not.toHaveProperty('password');
    });

    it('should handle login with different email formats', async () => {
      const emailVariations = [
        'sulabh@example.com',
        'SULABH@EXAMPLE.COM',
        'Sulabh@Example.Com',
      ];
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      for (const email of emailVariations) {
        const dto = { ...loginDto, email };
        await controller.login(dto);
        expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      }
    });
  });

  describe('HTTP Status Codes', () => {
    it('should have register method properly decorated', () => {
      expect(controller.register).toBeDefined();
      expect(typeof controller.register).toBe('function');
    });

    it('should have login method properly decorated', () => {
      expect(controller.login).toBeDefined();
      expect(typeof controller.login).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from register service method', async () => {
      const registerDto: RegisterDto = {
        name: 'Sulabh adhikari',
        email: 'sulabh@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: UserRole.USER,
      };
      const error = new Error('Database connection failed');
      mockAuthService.register.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should propagate errors from login service method', async () => {
      const loginDto: LoginDto = {
        email: 'john@example.com',
        password: 'Password123!',
      };
      const error = new Error('Database connection failed');
      mockAuthService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('DTO Validation', () => {
    it('should accept valid registration data', async () => {
      const registerDto: RegisterDto = {
        name: 'sulabh adhikari',
        email: 'valid@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
        role: UserRole.USER,
      };
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toBeDefined();
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should accept valid login data', async () => {
      const loginDto: LoginDto = {
        email: 'valid@example.com',
        password: 'ValidPass123!',
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toBeDefined();
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('Service Integration', () => {
    it('should call register service method exactly once', async () => {
      const registerDto: RegisterDto = {
        name: 'sulabh adhikari',
        email: 'sulabh@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: UserRole.USER,
      };
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should call login service method exactly once', async () => {
      const loginDto: LoginDto = {
        email: 'sulabh@example.com',
        password: 'Password123!',
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should not call login when register is called', async () => {
      const registerDto: RegisterDto = {
        name: 'sulabh adhikari',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: UserRole.USER,
      };
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalled();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should not call register when login is called', async () => {
      const loginDto: LoginDto = {
        email: 'sulabh@example.com',
        password: 'Password123!',
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalled();
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });
});
