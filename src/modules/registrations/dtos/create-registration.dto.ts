import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { RegistrationStatus } from '../entities/registration.entity';

export class CreateRegistrationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Event ID to register for',
  })
  @IsUUID()
  eventId: string;

  @ApiProperty({
    enum: RegistrationStatus,
    enumName: 'RegistrationStatus',
    example: RegistrationStatus.CONFIRMED,
    description: 'Registration status',
    required: false,
    default: RegistrationStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus = RegistrationStatus.CONFIRMED;
}
