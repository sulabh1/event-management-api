import { Injectable, BadRequestException } from '@nestjs/common';
import { User, UserRole } from './entities/user.entity';
import { UserRepository } from './users.repository';
import { RegisterDto } from '../auth/dtos/register.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import {
  ConflictError,
  NotFoundError,
} from '../../common/errors/application.errors';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: RegisterDto): Promise<User> {
    const emailExists = await this.userRepository.isEmailTaken(
      createUserDto.email,
    );
    if (emailExists) {
      throw new ConflictError('User already exist. Please login');
    }
    return this.userRepository.create(createUserDto);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    return user;
  }

  async getProfile(id: string): Promise<Partial<User>> {
    const user = await this.findById(id);
    const { ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateProfileDto): Promise<User> {
    await this.findById(id);

    if (updateUserDto.email) {
      const emailExists = await this.userRepository.isEmailTaken(
        updateUserDto.email,
        id,
      );
      if (emailExists) {
        throw new ConflictError('Email already in use');
      }
    }

    await this.userRepository.update(id, updateUserDto);

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ${id} not found`);
    }
    await this.userRepository.delete(id);
  }

  async findAll(page = 1, limit = 10, search = '', role?: UserRole) {
    return this.userRepository.findUsers({
      page,
      limit,
      search,
      role,
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findByEmailWithPassword(
      (await this.findById(userId)).email,
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.userRepository.changePassword(userId, newPassword);
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.findById(userId);
    await this.userRepository.updateRole(userId, role);
  }

  async getStatistics(days = 30) {
    return this.userRepository.getUserStats(days);
  }

  async searchUsers(query: string, limit = 10) {
    return this.userRepository.searchUsers(query, limit);
  }

  async userExists(id: string): Promise<boolean> {
    return this.userRepository.exists(id);
  }

  async getUserCount(): Promise<number> {
    return this.userRepository.getCount();
  }
}
