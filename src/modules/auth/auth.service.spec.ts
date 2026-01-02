/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtUtils } from '../../common/utils/jwt.utils';
import {
  AuthorizationError,
  ConflictError,
} from '../../common/errors/application.errors';
import { UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Sulabh Adhikari',
    email: 'sulabh@example.com',
    password: 'hashedPassword123',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    validatePassword: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'Sulabh Adhikari',
      email: 'sulabh@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: UserRole.USER,
    };

    it('should successfully register a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      jest.spyOn(JwtUtils, 'generateToken').mockReturnValue('mock.jwt.token');

      const result = await service.register(registerDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
      expect(JwtUtils.generateToken).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
        },
        token: 'mock.jwt.token',
      });
    });

    it('should throw ConflictError if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictError,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError if token generation fails', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      jest.spyOn(JwtUtils, 'generateToken').mockReturnValue(null as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        AuthorizationError,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Failed to generate authentication token',
      );
    });

    it('should register admin user with admin role', async () => {
      const adminRegisterDto: RegisterDto = {
        ...registerDto,
        role: UserRole.ADMIN,
      };
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(adminUser);
      jest.spyOn(JwtUtils, 'generateToken').mockReturnValue('admin.jwt.token');

      const result = await service.register(adminRegisterDto);

      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(mockUsersService.create).toHaveBeenCalledWith(adminRegisterDto);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'sulabh@example.com',
      password: 'Password123!',
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockResolvedValue(true);
      jest.spyOn(JwtUtils, 'generateToken').mockReturnValue('mock.jwt.token');

      const result = await service.login(loginDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockUser.validatePassword).toHaveBeenCalledWith(loginDto.password);
      expect(JwtUtils.generateToken).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
        },
        token: 'mock.jwt.token',
      });
    });

    it('should throw AuthorizationError if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(AuthorizationError);
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw AuthorizationError if password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(AuthorizationError);
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockUser.validatePassword).toHaveBeenCalledWith(loginDto.password);
    });

    it('should throw AuthorizationError if token generation fails', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockResolvedValue(true);
      jest.spyOn(JwtUtils, 'generateToken').mockReturnValue(null as any);

      await expect(service.login(loginDto)).rejects.toThrow(AuthorizationError);
      await expect(service.login(loginDto)).rejects.toThrow(
        'Failed to generate authentication token',
      );
    });

    it('should login admin user successfully', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockUsersService.findByEmail.mockResolvedValue(adminUser);
      adminUser.validatePassword = jest.fn().mockResolvedValue(true);
      jest.spyOn(JwtUtils, 'generateToken').mockReturnValue('admin.jwt.token');

      const result = await service.login(loginDto);

      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(result.token).toBe('admin.jwt.token');
    });

    it('should not expose password in response', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockResolvedValue(true);
      jest.spyOn(JwtUtils, 'generateToken').mockReturnValue('mock.jwt.token');

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle email with different casing during registration', async () => {
      const registerDto: RegisterDto = {
        name: 'Sulabh Adhikari',
        email: 'SULABH@EXAMPLE.COM',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: UserRole.USER,
      };
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      jest.spyOn(JwtUtils, 'generateToken').mockReturnValue('mock.jwt.token');

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'SULABH@EXAMPLE.COM',
      );
    });

    it('should handle email with different casing during login', async () => {
      const loginDto: LoginDto = {
        email: 'SULABH@EXAMPLE.COM',
        password: 'Password123!',
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockResolvedValue(true);
      jest.spyOn(JwtUtils, 'generateToken').mockReturnValue('mock.jwt.token');

      const result = await service.login(loginDto);

      expect(result).toBeDefined();
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'SULABH@EXAMPLE.COM',
      );
    });
  });
});
