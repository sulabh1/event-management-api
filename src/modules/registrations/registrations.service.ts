import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RegistrationsRepository } from './registrations.repository';
import { EventsService } from '../events/events.service';
import { UsersService } from '../users/users.service';
import { CreateRegistrationDto } from './dtos/create-registration.dto';
import {
  Registration,
  RegistrationStatus,
} from './entities/registration.entity';
import { ConflictError } from '../../common/errors/application.errors';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly registrationsRepository: RegistrationsRepository,
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  async register(
    createRegistrationDto: CreateRegistrationDto,
    userId: string,
  ): Promise<Registration> {
    try {
      const { eventId } = createRegistrationDto;

      await this.usersService.findById(userId);

      await this.eventsService.reserveSeats(eventId, 1);

      const existingRegistration =
        await this.registrationsRepository.findUserRegistrationForEvent(
          userId,
          eventId,
        );

      if (existingRegistration) {
        await this.eventsService.releaseSeats(eventId, 1);
        throw new ConflictError('User is already registered for this event');
      }

      const registration = this.registrationsRepository.create({
        userId,
        eventId,
        status: RegistrationStatus.CONFIRMED,
      });
      const savedRegistration =
        await this.registrationsRepository.save(registration);

      return savedRegistration;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error.message);
    }
  }

  async cancelRegistration(
    registrationId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const registration = await this.registrationsRepository.findOne({
      where: { id: registrationId },
      relations: ['event'],
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    if (userRole !== 'admin' && registration.userId !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own registrations',
      );
    }

    registration.status = RegistrationStatus.CANCELLED;
    await this.registrationsRepository.save(registration);

    if (registration.event) {
      await this.eventsService.releaseSeats(registration.event.id, 1);
    }
  }

  async getUserRegistrations(userId: string): Promise<Registration[]> {
    return this.registrationsRepository.findUserRegistrations(userId);
  }

  async getEventRegistrations(
    eventId: string,
    userRole: string,
  ): Promise<Registration[]> {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can view event registrations');
    }

    return this.registrationsRepository.findEventRegistrations(eventId);
  }

  async findOne(id: string): Promise<Registration> {
    const registration = await this.registrationsRepository.findOne({
      where: { id },
      relations: ['user', 'event'],
    });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    return registration;
  }
}
