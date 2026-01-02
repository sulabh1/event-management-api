/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { LoggerService } from '../common/logger/logger.service';
import Redis from 'ioredis';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedisClient = {
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      ping: jest.fn(),
    } as any;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor and event listeners', () => {
    it('should register connect event listener', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
    });

    it('should register error event listener', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });

    it('should register reconnecting event listener', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'reconnecting',
        expect.any(Function),
      );
    });

    it('should register close event listener', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function),
      );
    });

    it('should log on successful connection', () => {
      const connectCallback = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1] as Function;

      if (connectCallback) {
        connectCallback();
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Redis connected successfully',
        );
      }
    });

    it('should log error on connection error', () => {
      const errorCallback = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === 'error',
      )?.[1] as Function;

      if (errorCallback) {
        const error = new Error('Connection failed');
        errorCallback(error);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Redis connection error:',
          'Connection failed',
        );
      }
    });

    it('should log warning on reconnecting', () => {
      const reconnectCallback = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === 'reconnecting',
      )?.[1] as Function;

      if (reconnectCallback) {
        reconnectCallback();
        expect(mockLogger.warn).toHaveBeenCalledWith('Redis reconnecting...');
      }
    });

    it('should log warning on connection close', () => {
      const closeCallback = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === 'close',
      )?.[1] as Function;

      if (closeCallback) {
        closeCallback();
        expect(mockLogger.warn).toHaveBeenCalledWith('Redis connection closed');
      }
    });
  });

  describe('getEventKey', () => {
    it('should return correctly formatted event key', () => {
      const result = service.getEventKey('123');
      expect(result).toBe('event:123');
    });

    it('should handle UUID event id', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = service.getEventKey(uuid);
      expect(result).toBe(`event:${uuid}`);
    });

    it('should handle numeric string id', () => {
      const result = service.getEventKey('999');
      expect(result).toBe('event:999');
    });

    it('should handle empty string id', () => {
      const result = service.getEventKey('');
      expect(result).toBe('event:');
    });
  });

  describe('getEventsListKey', () => {
    it('should return default key when no filters provided', () => {
      const result = service.getEventsListKey();
      expect(result).toBe(
        'events:all:page=1:limit=10:sortBy=date:sortOrder=ASC',
      );
    });

    it('should return default key when empty filters object provided', () => {
      const result = service.getEventsListKey({});
      expect(result).toBe('events:page=1:limit=10:sortBy=date:sortOrder=ASC');
    });

    it('should include search parameter', () => {
      const result = service.getEventsListKey({ search: 'conference' });
      expect(result).toContain('search=conference');
    });

    it('should include startDate parameter', () => {
      const startDate = new Date('2024-01-15');
      const result = service.getEventsListKey({ startDate });
      expect(result).toContain('start=2024-01-15');
    });

    it('should include endDate parameter', () => {
      const endDate = new Date('2024-12-31');
      const result = service.getEventsListKey({ endDate });
      expect(result).toContain('end=2024-12-31');
    });

    it('should include availableOnly when true', () => {
      const result = service.getEventsListKey({ availableOnly: true });
      expect(result).toContain('availableOnly=true');
    });

    it('should not include availableOnly when false', () => {
      const result = service.getEventsListKey({ availableOnly: false });
      expect(result).not.toContain('availableOnly');
    });

    it('should include custom page and limit', () => {
      const result = service.getEventsListKey({ page: 2, limit: 20 });
      expect(result).toContain('page=2');
      expect(result).toContain('limit=20');
    });

    it('should include custom sortBy and sortOrder', () => {
      const result = service.getEventsListKey({
        sortBy: 'title',
        sortOrder: 'DESC',
      });
      expect(result).toContain('sortBy=title');
      expect(result).toContain('sortOrder=DESC');
    });

    it('should create key with all filters', () => {
      const filters = {
        search: 'tech',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        availableOnly: true,
        page: 3,
        limit: 50,
        sortBy: 'date',
        sortOrder: 'DESC' as const,
      };
      const result = service.getEventsListKey(filters);
      expect(result).toBe(
        'events:search=tech:start=2024-01-01:end=2024-12-31:availableOnly=true:page=3:limit=50:sortBy=date:sortOrder=DESC',
      );
    });

    it('should handle search with spaces', () => {
      const result = service.getEventsListKey({ search: 'tech conference' });
      expect(result).toContain('search=tech conference');
    });

    it('should handle search with special characters', () => {
      const result = service.getEventsListKey({ search: 'test@2024' });
      expect(result).toContain('search=test@2024');
    });
  });

  describe('get', () => {
    it('should retrieve and parse JSON data', async () => {
      const mockData = { id: 1, title: 'Test Event' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await service.get('event:1');

      expect(mockRedisClient.get).toHaveBeenCalledWith('event:1');
      expect(result).toEqual(mockData);
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when data is undefined', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('undefined-key');

      expect(result).toBeNull();
    });

    it('should handle array data', async () => {
      const mockArray = [{ id: 1 }, { id: 2 }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockArray));

      const result = await service.get('events:list');

      expect(result).toEqual(mockArray);
    });

    it('should log error on failure', async () => {
      const error = new Error('Redis get failed');
      mockRedisClient.get.mockRejectedValue(error);

      await service.get('error-key');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting key error-key'),
      );
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');

      await service.get('invalid-key');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set data with default TTL', async () => {
      const data = { id: 1, title: 'Event' };
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('event:1', data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'event:1',
        JSON.stringify(data),
        'EX',
        300,
      );
    });

    it('should set data with custom TTL', async () => {
      const data = { id: 1, title: 'Event' };
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('event:1', data, 600);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'event:1',
        JSON.stringify(data),
        'EX',
        600,
      );
    });

    it('should handle null data', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('null-key', null);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'null-key',
        'null',
        'EX',
        300,
      );
    });

    it('should handle array data', async () => {
      const data = [1, 2, 3];
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('array-key', data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'array-key',
        JSON.stringify(data),
        'EX',
        300,
      );
    });

    it('should handle string data', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('string-key', 'test');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'string-key',
        '"test"',
        'EX',
        300,
      );
    });

    it('should handle number data', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('number-key', 42);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'number-key',
        '42',
        'EX',
        300,
      );
    });

    it('should handle boolean data', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('bool-key', true);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'bool-key',
        'true',
        'EX',
        300,
      );
    });

    it('should log error on failure', async () => {
      const error = new Error('Redis set failed');
      mockRedisClient.set.mockRejectedValue(error);

      await service.set('error-key', { test: 'data' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error setting key error-key'),
      );
    });

    it('should use default TTL when TTL is 0', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('ttl-zero', { data: 'test' }, 0);

      // 0 is falsy, so it falls back to default TTL (300)
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'ttl-zero',
        '{"data":"test"}',
        'EX',
        300,
      );
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.del('event:1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('event:1');
    });

    it('should handle deleting non-existent key', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      await service.del('nonexistent');

      expect(mockRedisClient.del).toHaveBeenCalledWith('nonexistent');
    });

    it('should log error on failure', async () => {
      const error = new Error('Delete failed');
      mockRedisClient.del.mockRejectedValue(error);

      await service.del('error-key');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting key error-key'),
      );
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      const keys = ['event:1', 'event:2', 'event:3'];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(3);

      await service.delPattern('event:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('event:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });

    it('should handle no matching keys', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.delPattern('nonexistent:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('nonexistent:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle single key match', async () => {
      mockRedisClient.keys.mockResolvedValue(['event:1']);
      mockRedisClient.del.mockResolvedValue(1);

      await service.delPattern('event:1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('event:1');
    });

    it('should log error on keys fetch failure', async () => {
      const error = new Error('Keys fetch failed');
      mockRedisClient.keys.mockRejectedValue(error);

      await service.delPattern('pattern:*');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting pattern pattern:*'),
      );
    });

    it('should log error on delete failure', async () => {
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2']);
      const error = new Error('Delete failed');
      mockRedisClient.del.mockRejectedValue(error);

      await service.delPattern('keys:*');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting pattern keys:*'),
      );
    });

    it('should handle wildcard patterns', async () => {
      mockRedisClient.keys.mockResolvedValue(['events:search:*:page=1']);
      mockRedisClient.del.mockResolvedValue(1);

      await service.delPattern('events:search:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('events:search:*');
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('event:1');

      expect(mockRedisClient.exists).toHaveBeenCalledWith('event:1');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const error = new Error('Exists check failed');
      mockRedisClient.exists.mockRejectedValue(error);

      const result = await service.exists('error-key');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error checking key error-key'),
      );
    });
  });

  describe('ttls', () => {
    it('should return TTL for key', async () => {
      mockRedisClient.ttl.mockResolvedValue(300);

      const result = await service.ttls('event:1');

      expect(mockRedisClient.ttl).toHaveBeenCalledWith('event:1');
      expect(result).toBe(300);
    });

    it('should return -1 for key with no expiry', async () => {
      mockRedisClient.ttl.mockResolvedValue(-1);

      const result = await service.ttls('permanent-key');

      expect(result).toBe(-1);
    });

    it('should return -2 for non-existent key', async () => {
      mockRedisClient.ttl.mockResolvedValue(-2);

      const result = await service.ttls('nonexistent');

      expect(result).toBe(-2);
    });

    it('should return -2 on error', async () => {
      const error = new Error('TTL check failed');
      mockRedisClient.ttl.mockRejectedValue(error);

      const result = await service.ttls('error-key');

      expect(result).toBe(-2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting TTL for key error-key'),
      );
    });
  });

  describe('ping', () => {
    it('should return PONG on successful ping', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await service.ping();

      expect(mockRedisClient.ping).toHaveBeenCalled();
      expect(result).toBe('PONG');
    });

    it('should throw error on ping failure', async () => {
      const error = new Error('Ping failed');
      mockRedisClient.ping.mockRejectedValue(error);

      await expect(service.ping()).rejects.toThrow('Ping failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Redis ping failed'),
      );
    });
  });

  describe('getClient', () => {
    it('should return redis client instance', () => {
      const client = service.getClient();

      expect(client).toBe(mockRedisClient);
    });

    it('should return the same instance on multiple calls', () => {
      const client1 = service.getClient();
      const client2 = service.getClient();

      expect(client1).toBe(client2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large objects', async () => {
      const largeObject = {
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i })),
      };
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('large-key', largeObject);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'large-key',
        JSON.stringify(largeObject),
        'EX',
        300,
      );
    });

    it('should handle nested objects', async () => {
      const nested = {
        level1: {
          level2: {
            level3: { data: 'deep' },
          },
        },
      };
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('nested-key', nested);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'nested-key',
        JSON.stringify(nested),
        'EX',
        300,
      );
    });

    it('should handle special characters in keys', async () => {
      mockRedisClient.get.mockResolvedValue('{"data":"test"}');

      await service.get('key:with:colons:and-dashes');

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'key:with:colons:and-dashes',
      );
    });

    it('should handle empty string key', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await service.get('');

      expect(mockRedisClient.get).toHaveBeenCalledWith('');
    });
  });
});
