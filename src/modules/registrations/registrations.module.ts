import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationsService } from './registrations.service';
import {
  RegistrationsController,
  UserRegistrationsController,
} from './registrations.controller';
import { RegistrationsRepository } from './registrations.repository';
import { Registration } from './entities/registration.entity';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.modules';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registration]),
    EventsModule,
    UsersModule,
  ],
  controllers: [RegistrationsController, UserRegistrationsController],
  providers: [RegistrationsService, RegistrationsRepository],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
