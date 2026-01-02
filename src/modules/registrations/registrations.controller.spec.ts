import { Test, TestingModule } from '@nestjs/testing';
import {
  RegistrationsController,
  UserRegistrationsController,
} from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dtos/create-registration.dto';
import {
  Registration,
  RegistrationStatus,
} from './entities/registration.entity';
import { NotFoundError } from '../../common/errors/application.errors';

describe('RegistrationsController', () => {
  let controller: RegistrationsController;

  const mockEventId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';
  const mockRegistrationId = '770e8400-e29b-41d4-a716-446655440002';

  const mockRegistration: Partial<Registration> = {
    id: mockRegistrationId,
    userId: mockUserId,
    eventId: mockEventId,
    status: RegistrationStatus.CONFIRMED,
    registrationDate: new Date(),
  };

  const mockRequest = {
    user: {
      id: mockUserId,
      sub: mockUserId,
      email: 'user@example.com',
      role: 'user',
    },
  };

  const mockAdminRequest = {
    user: {
      id: mockUserId,
      sub: mockUserId,
      email: 'admin@example.com',
      role: 'admin',
    },
  };

  const mockRegistrationsService = {
    register: jest.fn(() => Promise.resolve(mockRegistration)),
    getUserRegistrations: jest.fn(() => Promise.resolve([mockRegistration])),
    cancelRegistration: jest.fn(() => Promise.resolve(undefined)),
    getEventRegistrations: jest.fn(() => Promise.resolve([mockRegistration])),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationsController],
      providers: [
        {
          provide: RegistrationsService,
          useValue: mockRegistrationsService,
        },
      ],
    }).compile();

    controller = module.get<RegistrationsController>(RegistrationsController);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register user for an event', async () => {
      const createDto: CreateRegistrationDto = { eventId: mockEventId };
      mockRegistrationsService.register.mockResolvedValue(mockRegistration);

      const result = await controller.register(mockEventId, mockRequest);

      expect(mockRegistrationsService.register).toHaveBeenCalledWith(
        createDto,
        mockUserId,
      );
      expect(mockRegistrationsService.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRegistration);
    });

    it('should create CreateRegistrationDto from eventId param', async () => {
      mockRegistrationsService.register.mockResolvedValue(mockRegistration);

      await controller.register(mockEventId, mockRequest);

      expect(mockRegistrationsService.register).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: mockEventId }),
        mockUserId,
      );
    });

    it('should use user id from request token', async () => {
      mockRegistrationsService.register.mockResolvedValue(mockRegistration);

      await controller.register(mockEventId, mockRequest);

      expect(mockRegistrationsService.register).toHaveBeenCalledWith(
        expect.any(Object),
        mockRequest.user.sub,
      );
    });

    it('should return registration object on success', async () => {
      mockRegistrationsService.register.mockResolvedValue(mockRegistration);

      const result = await controller.register(mockEventId, mockRequest);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('eventId');
      expect(result).toHaveProperty('status');
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Already registered');
      mockRegistrationsService.register.mockRejectedValue(error);

      await expect(
        controller.register(mockEventId, mockRequest),
      ).rejects.toThrow('Already registered');
    });

    it('should handle different event ids', async () => {
      const differentEventId = '880e8400-e29b-41d4-a716-446655440003';
      mockRegistrationsService.register.mockResolvedValue(mockRegistration);

      await controller.register(differentEventId, mockRequest);

      expect(mockRegistrationsService.register).toHaveBeenCalledWith(
        { eventId: differentEventId },
        mockUserId,
      );
    });
  });

  describe('cancelRegistration', () => {
    it('should successfully cancel registration', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([
        mockRegistration,
      ]);
      mockRegistrationsService.cancelRegistration.mockResolvedValue(undefined);

      await controller.cancelRegistration(mockEventId, mockRequest);

      expect(
        mockRegistrationsService.getUserRegistrations,
      ).toHaveBeenCalledWith(mockUserId);
      expect(mockRegistrationsService.cancelRegistration).toHaveBeenCalledWith(
        mockRegistrationId,
        mockUserId,
        'user',
      );
    });

    it('should fetch user registrations to find the right one', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([
        mockRegistration,
      ]);
      mockRegistrationsService.cancelRegistration.mockResolvedValue(undefined);

      await controller.cancelRegistration(mockEventId, mockRequest);

      expect(
        mockRegistrationsService.getUserRegistrations,
      ).toHaveBeenCalledWith(mockRequest.user.id);
    });

    it('should throw NotFoundError if registration not found for event', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([]);

      await expect(
        controller.cancelRegistration(mockEventId, mockRequest),
      ).rejects.toThrow(NotFoundError);
      await expect(
        controller.cancelRegistration(mockEventId, mockRequest),
      ).rejects.toThrow('Registration not found for this event');
    });

    it('should find correct registration by eventId', async () => {
      const otherRegistration: Partial<Registration> = {
        ...mockRegistration,
        id: '990e8400-e29b-41d4-a716-446655440004',
        eventId: '880e8400-e29b-41d4-a716-446655440003',
      };
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([
        otherRegistration,
        mockRegistration,
      ]);
      mockRegistrationsService.cancelRegistration.mockResolvedValue(undefined);

      await controller.cancelRegistration(mockEventId, mockRequest);

      expect(mockRegistrationsService.cancelRegistration).toHaveBeenCalledWith(
        mockRegistrationId,
        mockUserId,
        'user',
      );
    });

    it('should pass user role to service', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([
        mockRegistration,
      ]);
      mockRegistrationsService.cancelRegistration.mockResolvedValue(undefined);

      await controller.cancelRegistration(mockEventId, mockRequest);

      expect(mockRegistrationsService.cancelRegistration).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        mockRequest.user.role,
      );
    });

    it('should return void on success', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([
        mockRegistration,
      ]);
      mockRegistrationsService.cancelRegistration.mockResolvedValue(undefined);

      const result = await controller.cancelRegistration(
        mockEventId,
        mockRequest,
      );

      expect(result).toBeUndefined();
    });

    it('should not call cancelRegistration if registration not found', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([]);

      await expect(
        controller.cancelRegistration(mockEventId, mockRequest),
      ).rejects.toThrow(NotFoundError);

      expect(
        mockRegistrationsService.cancelRegistration,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getEventRegistrations', () => {
    it('should return all registrations for an event', async () => {
      const mockRegistrations = [mockRegistration, { ...mockRegistration }];
      mockRegistrationsService.getEventRegistrations.mockResolvedValue(
        mockRegistrations,
      );

      const result = await controller.getEventRegistrations(
        mockEventId,
        mockAdminRequest,
      );

      expect(
        mockRegistrationsService.getEventRegistrations,
      ).toHaveBeenCalledWith(mockEventId, 'admin');
      expect(result).toEqual(mockRegistrations);
    });

    it('should pass eventId from params', async () => {
      mockRegistrationsService.getEventRegistrations.mockResolvedValue([]);

      await controller.getEventRegistrations(mockEventId, mockAdminRequest);

      expect(
        mockRegistrationsService.getEventRegistrations,
      ).toHaveBeenCalledWith(mockEventId, expect.any(String));
    });

    it('should pass user role from request', async () => {
      mockRegistrationsService.getEventRegistrations.mockResolvedValue([]);

      await controller.getEventRegistrations(mockEventId, mockAdminRequest);

      expect(
        mockRegistrationsService.getEventRegistrations,
      ).toHaveBeenCalledWith(expect.any(String), mockAdminRequest.user.role);
    });

    it('should return empty array when no registrations', async () => {
      mockRegistrationsService.getEventRegistrations.mockResolvedValue([]);

      const result = await controller.getEventRegistrations(
        mockEventId,
        mockAdminRequest,
      );

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Access denied');
      mockRegistrationsService.getEventRegistrations.mockRejectedValue(error);

      await expect(
        controller.getEventRegistrations(mockEventId, mockAdminRequest),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('Service Integration', () => {
    it('should call register service method exactly once', async () => {
      mockRegistrationsService.register.mockResolvedValue(mockRegistration);

      await controller.register(mockEventId, mockRequest);

      expect(mockRegistrationsService.register).toHaveBeenCalledTimes(1);
    });

    it('should call getUserRegistrations and cancelRegistration in order', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([
        mockRegistration,
      ]);
      mockRegistrationsService.cancelRegistration.mockResolvedValue(undefined);

      await controller.cancelRegistration(mockEventId, mockRequest);

      expect(
        mockRegistrationsService.getUserRegistrations,
      ).toHaveBeenCalledTimes(1);
      expect(mockRegistrationsService.cancelRegistration).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should call getEventRegistrations service method exactly once', async () => {
      mockRegistrationsService.getEventRegistrations.mockResolvedValue([]);

      await controller.getEventRegistrations(mockEventId, mockAdminRequest);

      expect(
        mockRegistrationsService.getEventRegistrations,
      ).toHaveBeenCalledTimes(1);
    });
  });
});

describe('UserRegistrationsController', () => {
  let controller: UserRegistrationsController;

  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';
  const mockEventId = '550e8400-e29b-41d4-a716-446655440000';
  const mockRegistrationId = '770e8400-e29b-41d4-a716-446655440002';

  const mockRegistration: Partial<Registration> = {
    id: mockRegistrationId,
    userId: mockUserId,
    eventId: mockEventId,
    status: RegistrationStatus.CONFIRMED,
    registrationDate: new Date(),
  };
  const mockRequest = {
    user: {
      id: mockUserId,
      email: 'user@example.com',
      role: 'user',
    },
  };

  const mockRegistrationsService = {
    getUserRegistrations: jest.fn(() => Promise.resolve([mockRegistration])),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRegistrationsController],
      providers: [
        {
          provide: RegistrationsService,
          useValue: mockRegistrationsService,
        },
      ],
    }).compile();

    controller = module.get<UserRegistrationsController>(
      UserRegistrationsController,
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserRegistrations', () => {
    it('should return all registrations for current user', async () => {
      const mockRegistrations = [mockRegistration, { ...mockRegistration }];
      mockRegistrationsService.getUserRegistrations.mockResolvedValue(
        mockRegistrations,
      );

      const result = await controller.getUserRegistrations(mockRequest);

      expect(
        mockRegistrationsService.getUserRegistrations,
      ).toHaveBeenCalledWith(mockUserId);
      expect(
        mockRegistrationsService.getUserRegistrations,
      ).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRegistrations);
    });

    it('should use user id from request token', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([]);

      await controller.getUserRegistrations(mockRequest);

      expect(
        mockRegistrationsService.getUserRegistrations,
      ).toHaveBeenCalledWith(mockRequest.user.id);
    });

    it('should return empty array when user has no registrations', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([]);

      const result = await controller.getUserRegistrations(mockRequest);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return array of registrations with proper structure', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([
        mockRegistration,
      ]);

      const result = await controller.getUserRegistrations(mockRequest);

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('userId');
      expect(result[0]).toHaveProperty('eventId');
      expect(result[0]).toHaveProperty('status');
    });

    it('should handle different user ids', async () => {
      const differentRequest = {
        user: {
          id: '880e8400-e29b-41d4-a716-446655440003',
          email: 'other@example.com',
          role: 'user',
        },
      };
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([]);

      await controller.getUserRegistrations(differentRequest);

      expect(
        mockRegistrationsService.getUserRegistrations,
      ).toHaveBeenCalledWith(differentRequest.user.id);
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Database error');
      mockRegistrationsService.getUserRegistrations.mockRejectedValue(error);

      await expect(
        controller.getUserRegistrations(mockRequest),
      ).rejects.toThrow('Database error');
    });

    it('should call service method exactly once', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([]);

      await controller.getUserRegistrations(mockRequest);

      expect(
        mockRegistrationsService.getUserRegistrations,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('Service Integration', () => {
    it('should only call getUserRegistrations service method', async () => {
      mockRegistrationsService.getUserRegistrations.mockResolvedValue([
        mockRegistration,
      ]);

      await controller.getUserRegistrations(mockRequest);

      expect(mockRegistrationsService.getUserRegistrations).toHaveBeenCalled();
    });

    it('should not call any other service methods', async () => {
      const serviceWithAllMethods = {
        ...mockRegistrationsService,
        register: jest.fn(),
        cancelRegistration: jest.fn(),
        getEventRegistrations: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [UserRegistrationsController],
        providers: [
          {
            provide: RegistrationsService,
            useValue: serviceWithAllMethods,
          },
        ],
      }).compile();

      const testController = module.get<UserRegistrationsController>(
        UserRegistrationsController,
      );

      await testController.getUserRegistrations(mockRequest);

      expect(serviceWithAllMethods.register).not.toHaveBeenCalled();
      expect(serviceWithAllMethods.cancelRegistration).not.toHaveBeenCalled();
      expect(
        serviceWithAllMethods.getEventRegistrations,
      ).not.toHaveBeenCalled();
    });
  });
});
