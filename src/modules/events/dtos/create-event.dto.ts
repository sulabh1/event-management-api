import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ example: 'Tech Conference 2024' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiProperty({
    example: 'Annual technology conference featuring the latest innovations',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @ApiProperty({ example: '2024-12-15T09:00:00.000Z' })
  @IsDateString(
    {},
    {
      message:
        'Date must be a valid date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)',
    },
  )
  @IsNotEmpty({ message: 'Date is required' })
  date: string;

  @ApiProperty({ example: 'Convention Center, New York' })
  @IsString()
  @IsNotEmpty({ message: 'Venue is required' })
  venue: string;

  @ApiProperty({ example: 100 })
  @IsInt({ message: 'Total seats must be an integer' })
  @Min(1, { message: 'Total seats must be at least 1' })
  @Max(10000, { message: 'Total seats cannot exceed 10000' })
  totalSeats: number;
}
