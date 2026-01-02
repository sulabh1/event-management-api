import { Repository, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { User, UserRole } from './entities/user.entity';

export interface FindUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface UserStats {
  total: number;
  adminCount: number;
  userCount: number;
  recentUsers: number;
}

@Injectable()
export class UserRepository {
  private repository: Repository<User>;
  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(User);
  }

  async create(createUserDto: Partial<User>): Promise<User> {
    const user = this.repository.create(createUserDto);
    return this.repository.save(user);
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findByIdWithRelations(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['registrations'],
    });
  }

  async findAll(): Promise<User[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateData: Partial<User>): Promise<void> {
    await this.repository.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      select: [
        'id',
        'name',
        'email',
        'password',
        'role',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('user')
      .where('user.email = :email', { email });

    if (excludeUserId) {
      query.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async getUserWithoutPassword(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'],
    });
  }

  async findUsers(options: FindUsersOptions = {}): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search = '',
      role,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const skip = (page - 1) * limit;
    const query = this.repository.createQueryBuilder('user');

    if (search) {
      query.where('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    const total = await query.getCount();

    query.orderBy(`user.${sortBy}`, sortOrder).skip(skip).take(limit);

    const users = await query.getMany();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserStats(days = 30): Promise<UserStats> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const [total, adminCount, userCount, recentUsers] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { role: UserRole.ADMIN } }),
      this.repository.count({ where: { role: UserRole.USER } }),
      this.repository
        .createQueryBuilder('user')
        .where('user.createdAt >= :dateThreshold', { dateThreshold })
        .getCount(),
    ]);

    return {
      total,
      adminCount,
      userCount,
      recentUsers,
    };
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.repository.find({
      where: { role },
      order: { name: 'ASC' },
    });
  }

  async findAdmins(): Promise<User[]> {
    return this.findByRole(UserRole.ADMIN);
  }

  async findRegularUsers(): Promise<User[]> {
    return this.findByRole(UserRole.USER);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.repository.update(userId, {
      updatedAt: new Date(),
    });
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    await this.repository.update(userId, {
      password: newPassword,
      updatedAt: new Date(),
    });
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.repository.update(userId, {
      role,
      updatedAt: new Date(),
    });
  }

  async bulkUpdateRoles(userIds: string[], role: UserRole): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(User)
      .set({ role, updatedAt: new Date() })
      .where('id IN (:...userIds)', { userIds })
      .execute();
  }

  async searchUsers(query: string, limit = 10): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.name ILIKE :query OR user.email ILIKE :query', {
        query: `%${query}%`,
      })
      .orderBy('user.name', 'ASC')
      .take(limit)
      .getMany();
  }

  async findUsersByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async countUsersByDate(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    return this.repository
      .createQueryBuilder('user')
      .select('DATE(user.createdAt) as date')
      .addSelect('COUNT(*) as count')
      .where('user.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(user.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  async getCount(): Promise<number> {
    return this.repository.count();
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }

  async updateUser(
    id: string,
    updateData: Partial<User>,
  ): Promise<User | null> {
    await this.repository.update(id, updateData);
    return this.repository.findOne({ where: { id } });
  }
}
