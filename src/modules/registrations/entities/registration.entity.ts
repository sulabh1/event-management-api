import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Index,
  Unique,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum RegistrationStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Entity('registrations')
@Unique('UQ_registrations_user_event', ['user', 'event'])
@Index('IDX_registrations_user_id', ['user'])
@Index('IDX_registrations_event_id', ['event'])
@Index('IDX_registrations_status', ['status'])
@Index('IDX_registrations_registration_date', ['registrationDate'])
export class Registration {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'user_id' })
  userId: string;

  @ApiProperty()
  @Column({ name: 'event_id' })
  eventId: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'registration_date' })
  registrationDate: Date;

  @ApiProperty({ enum: RegistrationStatus })
  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.CONFIRMED,
  })
  status: RegistrationStatus;

  @ManyToOne(() => User, (user) => user.registrations, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Event, (event) => event.registrations, {
    nullable: false,
  })
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
