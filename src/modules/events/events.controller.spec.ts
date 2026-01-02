// src/events/events.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CreateEventDto } from './dtos/create-event.dto';
import { UpdateEventDto } from './dtos/update-event.dto';
import { SearchEventsDto } from './dtos/search-events.dto';
import { Event } from './entities/event.entity';

describe('EventsController', () => {
  let controller: EventsController;

  const mockEventId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';

  const mockEvent: Partial<Event> = {
    id: mockEventId,
    title: 'Tech Conference 2024',
    description: 'Annual tech conference',
    date: new Date('2024-12-31'),
    venue: 'Convention Center',
    totalSeats: 100,
    availableSeats: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEventsService = {
    create: jest.fn(() => Promise.resolve(mockEvent)),
    findAll: jest.fn(() => Promise.resolve([[mockEvent], 1])),
    findOne: jest.fn(() => Promise.resolve(mockEvent)),
    update: jest.fn(() => Promise.resolve(mockEvent)),
    remove: jest.fn(() => Promise.resolve(undefined)),
  };

  const mockRequest = {
    user: {
      id: mockUserId,
      email: 'admin@example.com',
      role: 'admin',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createEventDto: CreateEventDto = {
      title: 'Tech Conference 2024',
      description: 'Annual tech conference',
      date: '2024-12-31',
      venue: 'Convention Center',
      totalSeats: 100,
    };

    it('should create a new event', async () => {
      mockEventsService.create.mockResolvedValue(mockEvent);

      const result = await controller.create(createEventDto, mockRequest);

      expect(mockEventsService.create).toHaveBeenCalledWith(
        createEventDto,
        mockUserId,
      );
      expect(mockEventsService.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockEvent);
    });

    it('should pass user id from request to service', async () => {
      mockEventsService.create.mockResolvedValue(mockEvent);

      await controller.create(createEventDto, mockRequest);

      expect(mockEventsService.create).toHaveBeenCalledWith(
        createEventDto,
        mockRequest.user.id,
      );
    });

    it('should return created event with all properties', async () => {
      mockEventsService.create.mockResolvedValue(mockEvent);

      const result = await controller.create(createEventDto, mockRequest);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('venue');
      expect(result).toHaveProperty('totalSeats');
      expect(result).toHaveProperty('availableSeats');
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Database error');
      mockEventsService.create.mockRejectedValue(error);

      await expect(
        controller.create(createEventDto, mockRequest),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all events with pagination', async () => {
      const searchDto: SearchEventsDto = {
        page: 1,
        limit: 10,
      };
      mockEventsService.findAll.mockResolvedValue([[mockEvent], 1]);

      const result = await controller.findAll(searchDto);

      expect(mockEventsService.findAll).toHaveBeenCalledWith(searchDto);
      expect(mockEventsService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        events: [mockEvent],
        total: 1,
      });
    });

    it('should return empty array when no events found', async () => {
      const searchDto: SearchEventsDto = {
        page: 1,
        limit: 10,
      };
      mockEventsService.findAll.mockResolvedValue([[], 0]);

      const result = await controller.findAll(searchDto);

      expect(result).toEqual({
        events: [],
        total: 0,
      });
    });

    it('should handle search with filters', async () => {
      const searchDto: SearchEventsDto = {
        page: 1,
        limit: 10,
        title: 'Conference',
      };
      mockEventsService.findAll.mockResolvedValue([[mockEvent], 1]);

      const result = await controller.findAll(searchDto);

      expect(mockEventsService.findAll).toHaveBeenCalledWith(searchDto);
      expect(result.events).toHaveLength(1);
    });

    it('should handle search with date range', async () => {
      const searchDto: SearchEventsDto = {
        page: 1,
        limit: 10,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };
      mockEventsService.findAll.mockResolvedValue([[mockEvent], 1]);

      const result = await controller.findAll(searchDto);

      expect(mockEventsService.findAll).toHaveBeenCalledWith(searchDto);
      expect(result.events).toBeDefined();
    });

    it('should handle search with availableOnly filter', async () => {
      const searchDto: SearchEventsDto = {
        page: 1,
        limit: 10,
        availableOnly: true,
      };
      mockEventsService.findAll.mockResolvedValue([[mockEvent], 1]);

      const result = await controller.findAll(searchDto);

      expect(mockEventsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ availableOnly: true }),
      );
      expect(result.events).toBeDefined();
    });

    it('should handle empty search parameters', async () => {
      const searchDto: SearchEventsDto = {};
      mockEventsService.findAll.mockResolvedValue([[mockEvent], 1]);

      const result = await controller.findAll(searchDto);

      expect(mockEventsService.findAll).toHaveBeenCalledWith(searchDto);
      expect(result.events).toBeDefined();
    });

    it('should propagate errors from service', async () => {
      const searchDto: SearchEventsDto = { page: 1, limit: 10 };
      const error = new Error('Database error');
      mockEventsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(searchDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findOne', () => {
    it('should return a single event by id', async () => {
      mockEventsService.findOne.mockResolvedValue(mockEvent);

      const result = await controller.findOne(mockEventId);

      expect(mockEventsService.findOne).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsService.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockEvent);
    });

    it('should return event with all properties', async () => {
      mockEventsService.findOne.mockResolvedValue(mockEvent);

      const result = await controller.findOne(mockEventId);

      expect(result).toHaveProperty('id', mockEventId);
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('venue');
    });

    it('should propagate NotFoundError from service', async () => {
      const error = new Error('Event not found');
      mockEventsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(mockEventId)).rejects.toThrow(
        'Event not found',
      );
    });

    it('should handle different event ids', async () => {
      const differentId = '770e8400-e29b-41d4-a716-446655440011';
      const differentEvent = { ...mockEvent, id: differentId };
      mockEventsService.findOne.mockResolvedValue(differentEvent);

      const result = await controller.findOne(differentId);

      expect(mockEventsService.findOne).toHaveBeenCalledWith(differentId);
      expect(result).toHaveProperty('id', differentId);
    });
  });

  describe('update', () => {
    const updateEventDto: UpdateEventDto = {
      title: 'Updated Conference 2024',
      description: 'Updated description',
    };

    it('should update an event', async () => {
      const updatedEvent = { ...mockEvent, ...updateEventDto };
      mockEventsService.update.mockResolvedValue(updatedEvent as any);

      const result = await controller.update(mockEventId, updateEventDto);

      expect(mockEventsService.update).toHaveBeenCalledWith(
        mockEventId,
        updateEventDto,
      );
      expect(mockEventsService.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedEvent);
    });

    it('should return updated event with new values', async () => {
      const updatedEvent = { ...mockEvent, ...updateEventDto };
      mockEventsService.update.mockResolvedValue(updatedEvent as any);

      const result = await controller.update(mockEventId, updateEventDto);

      expect(result).toMatchObject(updateEventDto);
    });

    it('should handle partial updates', async () => {
      const partialUpdate: UpdateEventDto = {
        title: 'New Title Only',
      };
      const updatedEvent = { ...mockEvent, ...partialUpdate };
      mockEventsService.update.mockResolvedValue(updatedEvent as any);

      const result = await controller.update(mockEventId, partialUpdate);

      expect(mockEventsService.update).toHaveBeenCalledWith(
        mockEventId,
        partialUpdate,
      );
      expect(result.title).toBe('New Title Only');
    });

    it('should propagate NotFoundError from service', async () => {
      const error = new Error('Event not found');
      mockEventsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockEventId, updateEventDto),
      ).rejects.toThrow('Event not found');
    });

    it('should propagate validation errors from service', async () => {
      const error = new Error('Invalid data');
      mockEventsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockEventId, updateEventDto),
      ).rejects.toThrow('Invalid data');
    });
  });

  describe('remove', () => {
    it('should delete an event', async () => {
      mockEventsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockEventId);

      expect(mockEventsService.remove).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsService.remove).toHaveBeenCalledTimes(1);
    });

    it('should return void on successful deletion', async () => {
      mockEventsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockEventId);

      expect(result).toBeUndefined();
    });

    it('should propagate NotFoundError from service', async () => {
      const error = new Error('Event not found');
      mockEventsService.remove.mockRejectedValue(error);

      await expect(controller.remove(mockEventId)).rejects.toThrow(
        'Event not found',
      );
    });

    it('should handle deletion of different event ids', async () => {
      const differentId = '770e8400-e29b-41d4-a716-446655440011';
      mockEventsService.remove.mockResolvedValue(undefined);

      await controller.remove(differentId);

      expect(mockEventsService.remove).toHaveBeenCalledWith(differentId);
    });
  });

  describe('Service Integration', () => {
    it('should call create service method exactly once', async () => {
      const createEventDto: CreateEventDto = {
        title: 'Test Event',
        description: 'Test Description',
        date: '2024-12-31',
        venue: 'Test Venue',
        totalSeats: 50,
      };
      mockEventsService.create.mockResolvedValue(mockEvent);

      await controller.create(createEventDto, mockRequest);

      expect(mockEventsService.create).toHaveBeenCalledTimes(1);
    });

    it('should call findAll service method exactly once', async () => {
      const searchDto: SearchEventsDto = { page: 1, limit: 10 };
      mockEventsService.findAll.mockResolvedValue([[mockEvent], 1]);

      await controller.findAll(searchDto);

      expect(mockEventsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should call findOne service method exactly once', async () => {
      mockEventsService.findOne.mockResolvedValue(mockEvent);

      await controller.findOne(mockEventId);

      expect(mockEventsService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should call update service method exactly once', async () => {
      const updateEventDto: UpdateEventDto = { title: 'Updated' };
      mockEventsService.update.mockResolvedValue(mockEvent);

      await controller.update(mockEventId, updateEventDto);

      expect(mockEventsService.update).toHaveBeenCalledTimes(1);
    });

    it('should call remove service method exactly once', async () => {
      mockEventsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockEventId);

      expect(mockEventsService.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Request Handling', () => {
    it('should extract user id from request object', async () => {
      const createEventDto: CreateEventDto = {
        title: 'Test Event',
        description: 'Test Description',
        date: '2024-12-31',
        venue: 'Test Venue',
        totalSeats: 50,
      };
      mockEventsService.create.mockResolvedValue(mockEvent);

      await controller.create(createEventDto, mockRequest);

      expect(mockEventsService.create).toHaveBeenCalledWith(
        createEventDto,
        mockRequest.user.id,
      );
    });

    it('should handle request with different user', async () => {
      const differentRequest = {
        user: {
          id: '880e8400-e29b-41d4-a716-446655440022',
          email: 'different@example.com',
          role: 'admin',
        },
      };
      const createEventDto: CreateEventDto = {
        title: 'Test Event',
        description: 'Test Description',
        date: '2024-12-31',
        venue: 'Test Venue',
        totalSeats: 50,
      };
      mockEventsService.create.mockResolvedValue(mockEvent);

      await controller.create(createEventDto, differentRequest);

      expect(mockEventsService.create).toHaveBeenCalledWith(
        createEventDto,
        differentRequest.user.id,
      );
    });
  });

  describe('Response Formatting', () => {
    it('should format findAll response with events and total', async () => {
      const searchDto: SearchEventsDto = { page: 1, limit: 10 };
      const mockEvents = [mockEvent, { ...mockEvent, id: 'different-id' }];
      mockEventsService.findAll.mockResolvedValue([mockEvents, 2]);

      const result = await controller.findAll(searchDto);

      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('total');
      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return proper structure for empty results', async () => {
      const searchDto: SearchEventsDto = { page: 1, limit: 10 };
      mockEventsService.findAll.mockResolvedValue([[], 0]);

      const result = await controller.findAll(searchDto);

      expect(result).toEqual({
        events: [],
        total: 0,
      });
    });
  });
});
