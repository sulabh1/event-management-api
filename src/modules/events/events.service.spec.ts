import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { RedisService } from '../../redis/redis.service';
import { CreateEventDto } from './dtos/create-event.dto';
import { UpdateEventDto } from './dtos/update-event.dto';
import { SearchEventsDto } from './dtos/search-events.dto';
import { Event } from './entities/event.entity';
import { NotFoundError } from '../../common/errors/application.errors';

describe('EventsService', () => {
  let service: EventsService;

  const mockEventId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';

  const createMockEvent = (): Partial<Event> => ({
    id: mockEventId,
    title: 'Tech Conference 2024',
    description: 'Annual tech conference',
    date: new Date('2024-12-31'),
    venue: 'Convention Center',
    totalSeats: 100,
    availableSeats: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    hasAvailableSeats: jest.fn(() => true),
    reserveSeats: jest.fn(),
    releaseSeats: jest.fn(),
  });

  const mockEventsRepository = {
    create: jest.fn(() => createMockEvent()),
    save: jest.fn(() => Promise.resolve(createMockEvent())),
    findOne: jest.fn(() => Promise.resolve(createMockEvent())),
    findEventsWithPagination: jest.fn(() =>
      Promise.resolve([[createMockEvent()], 1]),
    ),
    remove: jest.fn(() => Promise.resolve(undefined)),
    findEventWithLock: jest.fn(() => Promise.resolve(createMockEvent())),
  };

  const mockRedisService = {
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve('OK')),
    del: jest.fn(() => Promise.resolve(1)),
    delPattern: jest.fn(() => Promise.resolve(1)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: EventsRepository,
          useValue: mockEventsRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);

    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createEventDto: CreateEventDto = {
      title: 'Tech Conference 2024',
      description: 'Annual tech conference',
      date: '2024-12-31',
      venue: 'Convention Center',
      totalSeats: 100,
    };

    it('should successfully create an event', async () => {
      const mockEvent = createMockEvent();
      mockEventsRepository.create.mockReturnValue(mockEvent);
      mockEventsRepository.save.mockResolvedValue(mockEvent);
      mockRedisService.delPattern.mockResolvedValue(1);

      const result = await service.create(createEventDto, mockUserId);

      expect(mockEventsRepository.create).toHaveBeenCalledWith({
        ...createEventDto,
        availableSeats: createEventDto.totalSeats,
      });
      expect(mockEventsRepository.save).toHaveBeenCalledWith(mockEvent);
      expect(mockRedisService.delPattern).toHaveBeenCalledWith('events:*');
      expect(result).toEqual(mockEvent);
    });

    it('should set availableSeats equal to totalSeats', async () => {
      const mockEvent = createMockEvent();
      mockEventsRepository.create.mockReturnValue(mockEvent);
      mockEventsRepository.save.mockResolvedValue(mockEvent);

      await service.create(createEventDto, mockUserId);

      expect(mockEventsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          availableSeats: createEventDto.totalSeats,
        }),
      );
    });

    it('should invalidate events cache after creation', async () => {
      const mockEvent = createMockEvent();
      mockEventsRepository.create.mockReturnValue(mockEvent);
      mockEventsRepository.save.mockResolvedValue(mockEvent);
      mockRedisService.delPattern.mockResolvedValue(1);

      await service.create(createEventDto, mockUserId);

      expect(mockRedisService.delPattern).toHaveBeenCalledWith('events:*');
    });

    it('should throw BadRequestException on database error', async () => {
      const error = new Error('Database error');
      mockEventsRepository.save.mockRejectedValue(error);

      await expect(service.create(createEventDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    const searchDto: SearchEventsDto = {
      page: 1,
      limit: 10,
    };

    it('should return cached events if available', async () => {
      const mockEvent = createMockEvent();
      const plainEvent = {
        id: mockEvent.id,
        title: mockEvent.title,
        description: mockEvent.description,
        date: mockEvent.date?.toISOString(),
        venue: mockEvent.venue,
        totalSeats: mockEvent.totalSeats,
        availableSeats: mockEvent.availableSeats,
        createdAt: mockEvent.createdAt?.toISOString(),
        updatedAt: mockEvent.updatedAt?.toISOString(),
      };
      const cachedData = JSON.stringify([[plainEvent], 1]);
      mockRedisService.get.mockResolvedValue(cachedData as any);

      const result = await service.findAll(searchDto);

      expect(mockRedisService.get).toHaveBeenCalled();
      expect(result).toEqual([[plainEvent], 1]);
      expect(
        mockEventsRepository.findEventsWithPagination,
      ).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findEventsWithPagination.mockResolvedValue([
        [mockEvent],
        1,
      ]);

      const result = await service.findAll(searchDto);

      expect(mockRedisService.get).toHaveBeenCalled();
      expect(
        mockEventsRepository.findEventsWithPagination,
      ).toHaveBeenCalledWith(0, 10, searchDto);
      expect(result).toEqual([[mockEvent], 1]);
    });

    it('should cache results after fetching from database', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findEventsWithPagination.mockResolvedValue([
        [mockEvent],
        1,
      ]);

      await service.findAll(searchDto);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify([[mockEvent], 1]),
        300,
      );
    });

    it('should calculate correct skip value for pagination', async () => {
      const searchDtoPage2: SearchEventsDto = {
        page: 2,
        limit: 10,
      };
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findEventsWithPagination.mockResolvedValue([
        [createMockEvent()],
        1,
      ]);

      await service.findAll(searchDtoPage2);

      expect(
        mockEventsRepository.findEventsWithPagination,
      ).toHaveBeenCalledWith(10, 10, searchDtoPage2);
    });

    it('should use default pagination values if not provided', async () => {
      const emptySearchDto: SearchEventsDto = {};
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findEventsWithPagination.mockResolvedValue([
        [createMockEvent()],
        1,
      ]);

      await service.findAll(emptySearchDto);

      expect(
        mockEventsRepository.findEventsWithPagination,
      ).toHaveBeenCalledWith(0, 10, emptySearchDto);
    });

    it('should throw NotFoundError on database error', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const error = new Error('Database error');
      mockEventsRepository.findEventsWithPagination.mockRejectedValue(error);

      await expect(service.findAll(searchDto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findOne', () => {
    it('should return cached event if available', async () => {
      const mockEvent = createMockEvent();
      const plainEvent = {
        id: mockEvent.id,
        title: mockEvent.title,
        description: mockEvent.description,
        date: mockEvent.date?.toISOString(),
        venue: mockEvent.venue,
        totalSeats: mockEvent.totalSeats,
        availableSeats: mockEvent.availableSeats,
        createdAt: mockEvent.createdAt?.toISOString(),
        updatedAt: mockEvent.updatedAt?.toISOString(),
      };
      const cachedEvent = JSON.stringify(plainEvent);
      mockRedisService.get.mockResolvedValue(cachedEvent as any);

      const result = await service.findOne(mockEventId);

      expect(mockRedisService.get).toHaveBeenCalledWith(`event:${mockEventId}`);
      expect(result).toEqual(plainEvent);
      expect(mockEventsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.findOne(mockEventId);

      expect(mockRedisService.get).toHaveBeenCalled();
      expect(mockEventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEventId },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should cache event after fetching from database', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(mockEvent);

      await service.findOne(mockEventId);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `event:${mockEventId}`,
        JSON.stringify(mockEvent),
        60,
      );
    });

    it('should throw NotFoundError if event does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(null as any);

      await expect(service.findOne(mockEventId)).rejects.toThrow(NotFoundError);
      await expect(service.findOne(mockEventId)).rejects.toThrow(
        `Event with ID ${mockEventId} not found`,
      );
    });

    it('should throw NotFoundError on database error', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const error = new Error('Database error');
      mockEventsRepository.findOne.mockRejectedValue(error);

      await expect(service.findOne(mockEventId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    const updateEventDto: UpdateEventDto = {
      title: 'Updated Conference 2024',
      description: 'Updated description',
    };

    it('should successfully update an event', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(mockEvent);

      // Ensure the saved event has a 'Date' type for the 'date' property, not a string.
      const savedEvent = {
        ...mockEvent,
        ...updateEventDto,
        date: mockEvent.date, // ensure date is still a Date object
      };
      mockEventsRepository.save.mockResolvedValue(savedEvent);

      const result = await service.update(mockEventId, updateEventDto);

      expect(mockEventsRepository.save).toHaveBeenCalled();
      expect(result).toMatchObject(updateEventDto);
    });

    it('should invalidate event cache after update', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(mockEvent);
      mockEventsRepository.save.mockResolvedValue(mockEvent);

      await service.update(mockEventId, updateEventDto);

      expect(mockRedisService.del).toHaveBeenCalledWith(`event:${mockEventId}`);
      expect(mockRedisService.delPattern).toHaveBeenCalledWith('events:*');
    });

    it('should throw BadRequestException if event does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(null as any);

      await expect(service.update(mockEventId, updateEventDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on save error', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(mockEvent);
      const error = new Error('Database error');
      mockEventsRepository.save.mockRejectedValue(error);

      await expect(service.update(mockEventId, updateEventDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should successfully remove an event', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(mockEvent);
      mockEventsRepository.remove.mockResolvedValue(undefined);

      await service.remove(mockEventId);

      expect(mockEventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEventId },
      });
      expect(mockEventsRepository.remove).toHaveBeenCalledWith(mockEvent);
    });

    it('should invalidate cache after removal', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(mockEvent);
      mockEventsRepository.remove.mockResolvedValue(undefined);

      await service.remove(mockEventId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`event:${mockEventId}`);
      expect(mockRedisService.delPattern).toHaveBeenCalledWith('events:*');
    });

    it('should throw NotFoundError if event does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(null as any);

      await expect(service.remove(mockEventId)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError on database error', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(mockEvent);
      const error = new Error('Database error');
      mockEventsRepository.remove.mockRejectedValue(error);

      await expect(service.remove(mockEventId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('reserveSeats', () => {
    it('should successfully reserve seats', async () => {
      const eventWithSeats = {
        ...createMockEvent(),
        availableSeats: 50,
        hasAvailableSeats: jest.fn(() => true),
        reserveSeats: jest.fn(),
      };
      mockEventsRepository.findEventWithLock.mockResolvedValue(eventWithSeats);
      mockEventsRepository.save.mockResolvedValue(eventWithSeats);

      const result = await service.reserveSeats(mockEventId, 5);

      expect(mockEventsRepository.findEventWithLock).toHaveBeenCalledWith(
        mockEventId,
      );
      expect(eventWithSeats.hasAvailableSeats).toHaveBeenCalledWith(5);
      expect(eventWithSeats.reserveSeats).toHaveBeenCalledWith(5);
      expect(mockEventsRepository.save).toHaveBeenCalledWith(eventWithSeats);
      expect(result).toEqual(eventWithSeats);
    });

    it('should reserve 1 seat by default', async () => {
      const eventWithSeats = {
        ...createMockEvent(),
        hasAvailableSeats: jest.fn(() => true),
        reserveSeats: jest.fn(),
      };
      mockEventsRepository.findEventWithLock.mockResolvedValue(eventWithSeats);
      mockEventsRepository.save.mockResolvedValue(eventWithSeats);

      await service.reserveSeats(mockEventId);

      expect(eventWithSeats.hasAvailableSeats).toHaveBeenCalledWith(1);
      expect(eventWithSeats.reserveSeats).toHaveBeenCalledWith(1);
    });

    it('should throw BadRequestException if event does not exist', async () => {
      mockEventsRepository.findEventWithLock.mockResolvedValue(null as any);

      await expect(service.reserveSeats(mockEventId, 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if not enough seats available', async () => {
      const eventWithNoSeats = {
        ...createMockEvent(),
        availableSeats: 2,
        hasAvailableSeats: jest.fn(() => false),
        reserveSeats: jest.fn(),
      };
      mockEventsRepository.findEventWithLock.mockResolvedValue(
        eventWithNoSeats,
      );

      await expect(service.reserveSeats(mockEventId, 5)).rejects.toThrow(
        BadRequestException,
      );
      expect(eventWithNoSeats.reserveSeats).not.toHaveBeenCalled();
    });

    it('should invalidate cache after reservation', async () => {
      const eventWithSeats = {
        ...createMockEvent(),
        hasAvailableSeats: jest.fn(() => true),
        reserveSeats: jest.fn(),
      };
      mockEventsRepository.findEventWithLock.mockResolvedValue(eventWithSeats);
      mockEventsRepository.save.mockResolvedValue(eventWithSeats);

      await service.reserveSeats(mockEventId, 5);

      expect(mockRedisService.del).toHaveBeenCalledWith(`event:${mockEventId}`);
      expect(mockRedisService.delPattern).toHaveBeenCalledWith('events:*');
    });

    it('should throw BadRequestException on database error', async () => {
      const eventWithSeats = {
        ...createMockEvent(),
        hasAvailableSeats: jest.fn(() => true),
        reserveSeats: jest.fn(),
      };
      mockEventsRepository.findEventWithLock.mockResolvedValue(eventWithSeats);
      const error = new Error('Database error');
      mockEventsRepository.save.mockRejectedValue(error);

      await expect(service.reserveSeats(mockEventId, 5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('releaseSeats', () => {
    it('should successfully release seats', async () => {
      const eventWithSeats = {
        ...createMockEvent(),
        availableSeats: 50,
        releaseSeats: jest.fn(),
      };
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(eventWithSeats);
      mockEventsRepository.save.mockResolvedValue(eventWithSeats);

      const result = await service.releaseSeats(mockEventId, 5);

      expect(eventWithSeats.releaseSeats).toHaveBeenCalledWith(5);
      expect(mockEventsRepository.save).toHaveBeenCalledWith(eventWithSeats);
      expect(result).toEqual(eventWithSeats);
    });

    it('should release 1 seat by default', async () => {
      const eventWithSeats = {
        ...createMockEvent(),
        releaseSeats: jest.fn(),
      };
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(eventWithSeats);
      mockEventsRepository.save.mockResolvedValue(eventWithSeats);

      await service.releaseSeats(mockEventId);

      expect(eventWithSeats.releaseSeats).toHaveBeenCalledWith(1);
    });

    it('should throw BadRequestException if event does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(null as any);

      await expect(service.releaseSeats(mockEventId, 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should invalidate cache after releasing seats', async () => {
      const eventWithSeats = {
        ...createMockEvent(),
        releaseSeats: jest.fn(),
      };
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(eventWithSeats);
      mockEventsRepository.save.mockResolvedValue(eventWithSeats);

      await service.releaseSeats(mockEventId, 5);

      expect(mockRedisService.del).toHaveBeenCalledWith(`event:${mockEventId}`);
      expect(mockRedisService.delPattern).toHaveBeenCalledWith('events:*');
    });

    it('should throw BadRequestException on save error', async () => {
      const eventWithSeats = {
        ...createMockEvent(),
        releaseSeats: jest.fn(),
      };
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(eventWithSeats);
      const error = new Error('Database error');
      mockEventsRepository.save.mockRejectedValue(error);

      await expect(service.releaseSeats(mockEventId, 5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate correct event cache key', async () => {
      const mockEvent = createMockEvent();
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findOne.mockResolvedValue(mockEvent);

      await service.findOne(mockEventId);

      expect(mockRedisService.get).toHaveBeenCalledWith(`event:${mockEventId}`);
    });

    it('should generate correct events list cache key', async () => {
      const searchDto: SearchEventsDto = {
        page: 1,
        limit: 10,
      };
      mockRedisService.get.mockResolvedValue(null);
      mockEventsRepository.findEventsWithPagination.mockResolvedValue([
        [createMockEvent()],
        1,
      ]);

      await service.findAll(searchDto);

      expect(mockRedisService.get).toHaveBeenCalledWith(
        `events:${JSON.stringify(searchDto)}`,
      );
    });
  });

  describe('Concurrency Handling', () => {
    it('should use pessimistic locking for seat reservation', async () => {
      const eventWithSeats = {
        ...createMockEvent(),
        hasAvailableSeats: jest.fn(() => true),
        reserveSeats: jest.fn(),
      };
      mockEventsRepository.findEventWithLock.mockResolvedValue(eventWithSeats);
      mockEventsRepository.save.mockResolvedValue(eventWithSeats);

      await service.reserveSeats(mockEventId, 1);

      expect(mockEventsRepository.findEventWithLock).toHaveBeenCalledWith(
        mockEventId,
      );
    });

    it('should prevent overbooking with multiple concurrent requests', async () => {
      const eventWithLimitedSeats = {
        ...createMockEvent(),
        availableSeats: 1,
        hasAvailableSeats: jest.fn(() => false),
        reserveSeats: jest.fn(),
      };
      mockEventsRepository.findEventWithLock.mockResolvedValue(
        eventWithLimitedSeats,
      );

      await expect(service.reserveSeats(mockEventId, 2)).rejects.toThrow(
        BadRequestException,
      );
      expect(eventWithLimitedSeats.reserveSeats).not.toHaveBeenCalled();
    });
  });
});
