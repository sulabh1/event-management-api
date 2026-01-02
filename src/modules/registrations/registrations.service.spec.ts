import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsRepository } from './registrations.repository';
import { EventsService } from '../events/events.service';
import { UsersService } from '../users/users.service';
import { CreateRegistrationDto } from './dtos/create-registration.dto';
import {
  Registration,
  RegistrationStatus,
} from './entities/registration.entity';

describe('RegistrationsService', () => {
  let service: RegistrationsService;

  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockEventId = '660e8400-e29b-41d4-a716-446655440001';
  const mockRegistrationId = '770e8400-e29b-41d4-a716-446655440002';

  const mockUser = {
    id: mockUserId,
    name: 'Sulabh Adhikari',
    email: 'sulabh@example.com',
    role: 'user',
  };

  const mockEvent = {
    id: mockEventId,
    title: 'Tech Conference 2024',
    description: 'Annual tech conference',
    date: new Date('2024-12-31'),
    venue: 'Convention Center',
    totalSeats: 100,
    availableSeats: 99,
  };

  const createMockRegistration = (): Partial<Registration> => ({
    id: mockRegistrationId,
    userId: mockUserId,
    eventId: mockEventId,
    status: RegistrationStatus.CONFIRMED,
    registrationDate: new Date(),
  });
  const mockRegistrationsRepository = {
    create: jest.fn(() => createMockRegistration()) as any,
    save: jest.fn(() => Promise.resolve(createMockRegistration())) as any,
    findOne: jest.fn(() => Promise.resolve(createMockRegistration())) as any,
    findUserRegistrationForEvent: jest.fn(() => Promise.resolve(null)) as any,
    findUserRegistrations: jest.fn(() =>
      Promise.resolve([createMockRegistration()]),
    ) as any,
    findEventRegistrations: jest.fn(() =>
      Promise.resolve([createMockRegistration()]),
    ) as any,
  };

  const mockEventsService = {
    reserveSeats: jest.fn(() => Promise.resolve(mockEvent)),
    releaseSeats: jest.fn(() => Promise.resolve(mockEvent)),
  };

  const mockUsersService = {
    findById: jest.fn(() => Promise.resolve(mockUser)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        {
          provide: RegistrationsRepository,
          useValue: mockRegistrationsRepository,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);

    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const createRegistrationDto: CreateRegistrationDto = {
      eventId: mockEventId,
    };

    it('should successfully register a user for an event', async () => {
      const mockRegistration = createMockRegistration();
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.reserveSeats.mockResolvedValue(mockEvent);
      mockRegistrationsRepository.findUserRegistrationForEvent.mockResolvedValue(
        null,
      );
      mockRegistrationsRepository.create.mockReturnValue(mockRegistration);
      mockRegistrationsRepository.save.mockResolvedValue(mockRegistration);

      const result = await service.register(createRegistrationDto, mockUserId);

      expect(mockUsersService.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockEventsService.reserveSeats).toHaveBeenCalledWith(
        mockEventId,
        1,
      );
      expect(
        mockRegistrationsRepository.findUserRegistrationForEvent,
      ).toHaveBeenCalledWith(mockUserId, mockEventId);
      expect(mockRegistrationsRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        eventId: mockEventId,
        status: RegistrationStatus.CONFIRMED,
      });
      expect(mockRegistrationsRepository.save).toHaveBeenCalledWith(
        mockRegistration,
      );
      expect(result).toEqual(mockRegistration);
    });

    it('should verify user exists before registration', async () => {
      const mockRegistration = createMockRegistration();
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.reserveSeats.mockResolvedValue(mockEvent);
      mockRegistrationsRepository.findUserRegistrationForEvent.mockResolvedValue(
        null,
      );
      mockRegistrationsRepository.save.mockResolvedValue(mockRegistration);

      await service.register(createRegistrationDto, mockUserId);

      expect(mockUsersService.findById).toHaveBeenCalledWith(mockUserId);
    });

    it('should reserve seat before creating registration', async () => {
      const mockRegistration = createMockRegistration();
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.reserveSeats.mockResolvedValue(mockEvent);
      mockRegistrationsRepository.findUserRegistrationForEvent.mockResolvedValue(
        null,
      );
      mockRegistrationsRepository.save.mockResolvedValue(mockRegistration);

      await service.register(createRegistrationDto, mockUserId);

      expect(mockEventsService.reserveSeats).toHaveBeenCalledWith(
        mockEventId,
        1,
      );
    });

    it('should throw BadRequestException if user already registered', async () => {
      const mockRegistration = createMockRegistration();
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.reserveSeats.mockResolvedValue(mockEvent);
      mockRegistrationsRepository.findUserRegistrationForEvent.mockResolvedValue(
        mockRegistration,
      );
      mockEventsService.releaseSeats.mockResolvedValue(mockEvent);

      await expect(
        service.register(createRegistrationDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.register(createRegistrationDto, mockUserId),
      ).rejects.toThrow('User is already registered for this event');

      expect(mockEventsService.releaseSeats).toHaveBeenCalledWith(
        mockEventId,
        1,
      );
    });

    it('should release seat if duplicate registration detected', async () => {
      const mockRegistration = createMockRegistration();
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.reserveSeats.mockResolvedValue(mockEvent);
      mockRegistrationsRepository.findUserRegistrationForEvent.mockResolvedValue(
        mockRegistration,
      );
      mockEventsService.releaseSeats.mockResolvedValue(mockEvent);

      await expect(
        service.register(createRegistrationDto, mockUserId),
      ).rejects.toThrow(BadRequestException);

      expect(mockEventsService.releaseSeats).toHaveBeenCalledWith(
        mockEventId,
        1,
      );
      expect(mockRegistrationsRepository.save).not.toHaveBeenCalled();
    });

    it('should set registration status to CONFIRMED', async () => {
      const mockRegistration = createMockRegistration();
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.reserveSeats.mockResolvedValue(mockEvent);
      mockRegistrationsRepository.findUserRegistrationForEvent.mockResolvedValue(
        null,
      );
      mockRegistrationsRepository.save.mockResolvedValue(mockRegistration);

      await service.register(createRegistrationDto, mockUserId);

      expect(mockRegistrationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RegistrationStatus.CONFIRMED,
        }),
      );
    });

    it('should throw BadRequestException on database error', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.reserveSeats.mockResolvedValue(mockEvent);
      mockRegistrationsRepository.findUserRegistrationForEvent.mockResolvedValue(
        null,
      );
      const error = new Error('Database error');
      mockRegistrationsRepository.save.mockRejectedValue(error);

      await expect(
        service.register(createRegistrationDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user not found', async () => {
      const error = new Error('User not found');
      mockUsersService.findById.mockRejectedValue(error);

      await expect(
        service.register(createRegistrationDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if event has no seats', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      const error = new Error('No seats available');
      mockEventsService.reserveSeats.mockRejectedValue(error);

      await expect(
        service.register(createRegistrationDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelRegistration', () => {
    it('should successfully cancel a registration', async () => {
      const registrationWithEvent: any = {
        ...createMockRegistration(),
        event: mockEvent,
        status: RegistrationStatus.CONFIRMED,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithEvent,
      );
      mockRegistrationsRepository.save.mockResolvedValue({
        ...registrationWithEvent,
        status: RegistrationStatus.CANCELLED,
      });
      mockEventsService.releaseSeats.mockResolvedValue(mockEvent);

      await service.cancelRegistration(mockRegistrationId, mockUserId, 'user');

      expect(mockRegistrationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRegistrationId },
        relations: ['event'],
      });
      expect(mockRegistrationsRepository.save).toHaveBeenCalled();
      expect(mockEventsService.releaseSeats).toHaveBeenCalledWith(
        mockEventId,
        1,
      );
    });

    it('should throw NotFoundException if registration not found', async () => {
      mockRegistrationsRepository.findOne.mockResolvedValue(null as any);

      await expect(
        service.cancelRegistration(mockRegistrationId, mockUserId, 'user'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.cancelRegistration(mockRegistrationId, mockUserId, 'user'),
      ).rejects.toThrow('Registration not found');
    });

    it('should throw ForbiddenException if user tries to cancel another users registration', async () => {
      const differentUserId = '880e8400-e29b-41d4-a716-446655440003';
      const mockRegistration = createMockRegistration();
      mockRegistrationsRepository.findOne.mockResolvedValue(mockRegistration);

      await expect(
        service.cancelRegistration(mockRegistrationId, differentUserId, 'user'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.cancelRegistration(mockRegistrationId, differentUserId, 'user'),
      ).rejects.toThrow('You can only cancel your own registrations');
    });

    it('should allow admin to cancel any registration', async () => {
      const differentUserId = '880e8400-e29b-41d4-a716-446655440003';
      const registrationWithEvent: any = {
        ...createMockRegistration(),
        event: mockEvent,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithEvent,
      );
      mockRegistrationsRepository.save.mockResolvedValue(registrationWithEvent);
      mockEventsService.releaseSeats.mockResolvedValue(mockEvent);

      await service.cancelRegistration(
        mockRegistrationId,
        differentUserId,
        'admin',
      );

      expect(mockRegistrationsRepository.save).toHaveBeenCalled();
      expect(mockEventsService.releaseSeats).toHaveBeenCalledWith(
        mockEventId,
        1,
      );
    });

    it('should allow user to cancel their own registration', async () => {
      const registrationWithEvent: any = {
        ...createMockRegistration(),
        event: mockEvent,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithEvent,
      );
      mockRegistrationsRepository.save.mockResolvedValue(registrationWithEvent);
      mockEventsService.releaseSeats.mockResolvedValue(mockEvent);

      await service.cancelRegistration(mockRegistrationId, mockUserId, 'user');

      expect(mockRegistrationsRepository.save).toHaveBeenCalled();
    });

    it('should update registration status to CANCELLED', async () => {
      const registrationWithEvent: any = {
        ...createMockRegistration(),
        event: mockEvent,
        status: RegistrationStatus.CONFIRMED,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithEvent,
      );
      mockRegistrationsRepository.save.mockImplementation(
        (reg: Partial<Registration>) => Promise.resolve(reg),
      );
      mockEventsService.releaseSeats.mockResolvedValue(mockEvent);

      await service.cancelRegistration(mockRegistrationId, mockUserId, 'user');

      expect(mockRegistrationsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RegistrationStatus.CANCELLED,
        }),
      );
    });

    it('should release seat after cancellation', async () => {
      const registrationWithEvent: any = {
        ...createMockRegistration(),
        event: mockEvent,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithEvent,
      );
      mockRegistrationsRepository.save.mockResolvedValue(registrationWithEvent);
      mockEventsService.releaseSeats.mockResolvedValue(mockEvent);

      await service.cancelRegistration(mockRegistrationId, mockUserId, 'user');

      expect(mockEventsService.releaseSeats).toHaveBeenCalledWith(
        mockEventId,
        1,
      );
    });

    it('should handle registration without event relation', async () => {
      const registrationWithoutEvent: any = {
        ...createMockRegistration(),
        event: null,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithoutEvent,
      );
      mockRegistrationsRepository.save.mockResolvedValue(
        registrationWithoutEvent,
      );

      await service.cancelRegistration(mockRegistrationId, mockUserId, 'user');

      expect(mockRegistrationsRepository.save).toHaveBeenCalled();
      expect(mockEventsService.releaseSeats).not.toHaveBeenCalled();
    });
  });

  describe('getUserRegistrations', () => {
    it('should return all registrations for a user', async () => {
      const mockRegistrations = [
        createMockRegistration(),
        createMockRegistration(),
      ];
      mockRegistrationsRepository.findUserRegistrations.mockResolvedValue(
        mockRegistrations,
      );

      const result = await service.getUserRegistrations(mockUserId);

      expect(
        mockRegistrationsRepository.findUserRegistrations,
      ).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockRegistrations);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if user has no registrations', async () => {
      mockRegistrationsRepository.findUserRegistrations.mockResolvedValue([]);

      const result = await service.getUserRegistrations(mockUserId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle different user ids', async () => {
      const differentUserId = '880e8400-e29b-41d4-a716-446655440003';
      mockRegistrationsRepository.findUserRegistrations.mockResolvedValue([]);

      await service.getUserRegistrations(differentUserId);

      expect(
        mockRegistrationsRepository.findUserRegistrations,
      ).toHaveBeenCalledWith(differentUserId);
    });
  });

  describe('getEventRegistrations', () => {
    it('should return all registrations for an event when user is admin', async () => {
      const mockRegistrations = [
        createMockRegistration(),
        createMockRegistration(),
      ];
      mockRegistrationsRepository.findEventRegistrations.mockResolvedValue(
        mockRegistrations,
      );

      const result = await service.getEventRegistrations(mockEventId, 'admin');

      expect(
        mockRegistrationsRepository.findEventRegistrations,
      ).toHaveBeenCalledWith(mockEventId);
      expect(result).toEqual(mockRegistrations);
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      await expect(
        service.getEventRegistrations(mockEventId, 'user'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getEventRegistrations(mockEventId, 'user'),
      ).rejects.toThrow('Only admins can view event registrations');

      expect(
        mockRegistrationsRepository.findEventRegistrations,
      ).not.toHaveBeenCalled();
    });

    it('should return empty array if event has no registrations', async () => {
      mockRegistrationsRepository.findEventRegistrations.mockResolvedValue([]);

      const result = await service.getEventRegistrations(mockEventId, 'admin');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should not allow users with other roles to view registrations', async () => {
      await expect(
        service.getEventRegistrations(mockEventId, 'moderator'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.getEventRegistrations(mockEventId, 'guest'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a registration by id', async () => {
      const registrationWithRelations: any = {
        ...createMockRegistration(),
        user: mockUser,
        event: mockEvent,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithRelations,
      );

      const result = await service.findOne(mockRegistrationId);

      expect(mockRegistrationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRegistrationId },
        relations: ['user', 'event'],
      });
      expect(result).toEqual(registrationWithRelations);
    });

    it('should throw NotFoundException if registration not found', async () => {
      mockRegistrationsRepository.findOne.mockResolvedValue(null as any);

      await expect(service.findOne(mockRegistrationId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(mockRegistrationId)).rejects.toThrow(
        `Registration with ID ${mockRegistrationId} not found`,
      );
    });

    it('should include user and event relations', async () => {
      const registrationWithRelations: any = {
        ...createMockRegistration(),
        user: mockUser,
        event: mockEvent,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithRelations,
      );

      const result = await service.findOne(mockRegistrationId);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('event');
    });

    it('should handle different registration ids', async () => {
      const differentId = '990e8400-e29b-41d4-a716-446655440004';
      const registrationWithRelations: any = {
        ...createMockRegistration(),
        id: differentId,
        user: mockUser,
        event: mockEvent,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithRelations,
      );

      await service.findOne(differentId);

      expect(mockRegistrationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: differentId },
        relations: ['user', 'event'],
      });
    });
  });

  describe('Error Handling', () => {
    it('should wrap ConflictError in BadRequestException during registration', async () => {
      const mockRegistration = createMockRegistration();
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.reserveSeats.mockResolvedValue(mockEvent);
      mockRegistrationsRepository.findUserRegistrationForEvent.mockResolvedValue(
        mockRegistration,
      );
      mockEventsService.releaseSeats.mockResolvedValue(mockEvent);

      await expect(
        service.register({ eventId: mockEventId }, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log errors during registration', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log');
      mockUsersService.findById.mockResolvedValue(mockUser);
      const error = new Error('Test error');
      mockEventsService.reserveSeats.mockRejectedValue(error);

      await expect(
        service.register({ eventId: mockEventId }, mockUserId),
      ).rejects.toThrow(BadRequestException);

      expect(consoleLogSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full registration flow', async () => {
      const mockRegistration = createMockRegistration();
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.reserveSeats.mockResolvedValue(mockEvent);
      mockRegistrationsRepository.findUserRegistrationForEvent.mockResolvedValue(
        null,
      );
      mockRegistrationsRepository.create.mockReturnValue(mockRegistration);
      mockRegistrationsRepository.save.mockResolvedValue(mockRegistration);

      const result = await service.register(
        { eventId: mockEventId },
        mockUserId,
      );

      expect(mockUsersService.findById).toHaveBeenCalledTimes(1);
      expect(mockEventsService.reserveSeats).toHaveBeenCalledTimes(1);
      expect(
        mockRegistrationsRepository.findUserRegistrationForEvent,
      ).toHaveBeenCalledTimes(1);
      expect(mockRegistrationsRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should complete full cancellation flow', async () => {
      const registrationWithEvent: any = {
        ...createMockRegistration(),
        event: mockEvent,
      };
      mockRegistrationsRepository.findOne.mockResolvedValue(
        registrationWithEvent,
      );
      mockRegistrationsRepository.save.mockResolvedValue(registrationWithEvent);
      mockEventsService.releaseSeats.mockResolvedValue(mockEvent);

      await service.cancelRegistration(mockRegistrationId, mockUserId, 'user');

      expect(mockRegistrationsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockRegistrationsRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventsService.releaseSeats).toHaveBeenCalledTimes(1);
    });
  });
});
