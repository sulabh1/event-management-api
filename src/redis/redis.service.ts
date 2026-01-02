import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class RedisService {
  private readonly ttl = parseInt(process.env.REDIS_TTL ?? '300', 10);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly logger: LoggerService,
  ) {
    this.redisClient.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis connection error:', error.message);
    });

    this.redisClient.on('reconnecting', () => {
      this.logger.warn('Redis reconnecting...');
    });

    this.redisClient.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  getEventKey(id: string): string {
    return `event:${id}`;
  }

  getEventsListKey(filters?: {
    search?: string;
    startDate?: Date;
    endDate?: Date;
    availableOnly?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): string {
    if (!filters) {
      return 'events:all:page=1:limit=10:sortBy=date:sortOrder=ASC';
    }
    const {
      search = '',
      startDate,
      endDate,
      availableOnly = false,
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'ASC',
    } = filters;

    const keyParts = ['events'];

    if (search) {
      keyParts.push(`search=${search}`);
    }
    if (startDate) {
      keyParts.push(`start=${startDate.toISOString().split('T')[0]}`);
    }
    if (endDate) {
      keyParts.push(`end=${endDate.toISOString().split('T')[0]}`);
    }
    if (availableOnly) {
      keyParts.push('availableOnly=true');
    }
    keyParts.push(`page=${page}`);
    keyParts.push(`limit=${limit}`);
    keyParts.push(`sortBy=${sortBy}`);
    keyParts.push(`sortOrder=${sortOrder}`);

    return keyParts.join(':');
  }

  async get(key: string): Promise<any> {
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Error getting key ${key}: ${error}`);
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.redisClient.set(
        key,
        JSON.stringify(value),
        'EX',
        ttl || this.ttl,
      );
    } catch (error) {
      this.logger.error(`Error setting key ${key}:${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:${error.message}`);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}:${error.message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking key ${key}:${error.message}`);
      return false;
    }
  }

  async ttls(key: string): Promise<number> {
    try {
      return await this.redisClient.ttl(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:${error.message}`);
      return -2;
    }
  }

  async ping(): Promise<string> {
    try {
      return await this.redisClient.ping();
    } catch (error) {
      this.logger.error(`Redis ping failed: ${error}`);
      throw error;
    }
  }

  getClient() {
    return this.redisClient;
  }
}
