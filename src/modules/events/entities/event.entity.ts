import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  BeforeInsert,
} from 'typeorm';
import { Registration } from '../../registrations/entities/registration.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  ConflictError,
  ServiceUnavailableError,
} from '../../../common/errors/application.errors';

@Entity('events')
@Index(['date'])
@Index(['availableSeats'])
export class Event {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ length: 255 })
  title: string;

  @ApiProperty()
  @Column('text')
  description: string;

  @ApiProperty()
  @Column({ type: 'timestamptz' })
  date: Date;

  @ApiProperty()
  @Column({ length: 255 })
  venue: string;

  @ApiProperty()
  @Column({ name: 'total_seats', type: 'int' })
  totalSeats: number;

  @ApiProperty()
  @Column({ name: 'available_seats', type: 'int' })
  @Index('IDX_events_available_seats')
  availableSeats: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  @Index('IDX_events_created_at')
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Registration, (registration) => registration.event)
  registrations: Registration[];

  hasAvailableSeats(requestedSeats: number = 1): boolean {
    if (requestedSeats <= 0) {
      throw new ConflictError('Number of seats must be greater than 0');
    }

    return this.availableSeats >= requestedSeats;
  }

  reserveSeats(seats: number = 1): void {
    if (!this.hasAvailableSeats(seats)) {
      throw new ConflictError('Not enough available seats');
    }

    if (seats <= 0) {
      throw new ConflictError('Number of seats must be greater than 0');
    }

    if (this.availableSeats - seats < 0) {
      throw new ConflictError('Cannot reserve more seats than available');
    }

    this.availableSeats -= seats;

    if (this.availableSeats < 0) {
      throw new ServiceUnavailableError(
        'Seat reservation resulted in negative available seats',
      );
    }
  }

  releaseSeats(seats: number = 1): void {
    if (seats <= 0) {
      throw new ConflictError('Number of seats must be greater than 0');
    }

    if (this.availableSeats + seats > this.totalSeats) {
      throw new ConflictError('Cannot release more seats than total capacity');
    }

    this.availableSeats += seats;

    if (this.availableSeats > this.totalSeats) {
      throw new ServiceUnavailableError(
        'Seat release resulted in more seats than total capacity',
      );
    }
  }

  isSoldOut(): boolean {
    return this.availableSeats === 0;
  }

  getBookedSeats(): number {
    return this.totalSeats - this.availableSeats;
  }

  isPastEvent(): boolean {
    return new Date() > new Date(this.date);
  }

  getStatus(): string {
    if (this.isPastEvent()) {
      return 'PAST';
    }
    if (this.isSoldOut()) {
      return 'SOLD_OUT';
    }
    if (this.availableSeats < this.totalSeats * 0.2) {
      return 'ALMOST_SOLD_OUT';
    }
    return 'AVAILABLE';
  }

  @BeforeInsert()
  setInitialAvailableSeats(): void {
    if (!this.availableSeats && this.totalSeats) {
      this.availableSeats = this.totalSeats;
    }
  }

  validate(): void {
    if (this.totalSeats <= 0) {
      throw new ConflictError('Total seats must be greater than 0');
    }

    if (this.availableSeats < 0) {
      throw new ConflictError('Available seats cannot be negative');
    }

    if (this.availableSeats > this.totalSeats) {
      throw new ConflictError('Available seats cannot exceed total seats');
    }

    if (new Date(this.date) < new Date()) {
      throw new ConflictError('Event date cannot be in the past');
    }
  }
}
