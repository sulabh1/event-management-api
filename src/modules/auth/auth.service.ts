import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtUtils } from '../../common/utils/jwt.utils';
import {
  AuthorizationError,
  ConflictError,
} from '../../common/errors/application.errors';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const user = await this.usersService.create(registerDto);
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new AuthorizationError('Invalid credentials');
    }

    const isValidPassword = await user.validatePassword(loginDto.password);
    if (!isValidPassword) {
      throw new AuthorizationError('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = JwtUtils.generateToken(payload);

    if (!token) {
      throw new AuthorizationError('Failed to generate authentication token');
    }

    return token;
  }
}
