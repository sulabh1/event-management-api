import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  Registration,
  RegistrationStatus,
} from './entities/registration.entity';

@Injectable()
export class RegistrationsRepository extends Repository<Registration> {
  constructor(private dataSource: DataSource) {
    super(Registration, dataSource.createEntityManager());
  }

  async findUserRegistrationForEvent(
    userId: string,
    eventId: string,
  ): Promise<Registration | null> {
    return this.findOne({
      where: { userId, eventId, status: RegistrationStatus.CONFIRMED },
    });
  }

  async findUserRegistrations(userId: string): Promise<Registration[]> {
    return this.find({
      where: { userId, status: RegistrationStatus.CONFIRMED },
      relations: ['event'],
      order: { registrationDate: 'DESC' },
    });
  }

  async findEventRegistrations(eventId: string): Promise<Registration[]> {
    return this.find({
      where: { eventId, status: RegistrationStatus.CONFIRMED },
      relations: ['user'],
      order: { registrationDate: 'DESC' },
    });
  }

  async cancelRegistration(id: string): Promise<Registration | null> {
    const registration = await this.findOne({ where: { id } });
    if (registration) {
      registration.status = RegistrationStatus.CANCELLED;
      return this.save(registration);
    }
    return null;
  }
}
