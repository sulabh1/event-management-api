import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dtos/create-registration.dto';
import { Registration } from './entities/registration.entity';
import { JWTAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { NotFoundError } from '../../common/errors/application.errors';

@ApiTags('registrations')
@Controller('events/:eventId/register')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  @ApiOperation({ summary: 'Register for an event' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Already registered' })
  @ApiResponse({
    status: 404,
    description: 'Event not found or no seats available',
  })
  async register(
    @Param('eventId') eventId: string,
    @Req() req,
  ): Promise<Registration> {
    const createRegistrationDto: CreateRegistrationDto = { eventId };
    return this.registrationsService.register(
      createRegistrationDto,
      req.user.sub,
    );
  }

  @Delete()
  @ApiOperation({ summary: 'Cancel registration for an event' })
  @ApiResponse({ status: 200, description: 'Registration cancelled' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async cancelRegistration(
    @Param('eventId') eventId: string,
    @Req() req,
  ): Promise<void> {
    const registration = await this.registrationsService.getUserRegistrations(
      req.user.id,
    );
    const userRegistration = registration.find((r) => r.eventId === eventId);

    if (!userRegistration) {
      throw new NotFoundError('Registration not found for this event');
    }

    return this.registrationsService.cancelRegistration(
      userRegistration.id,
      req.user.id,
      req.user.role,
    );
  }

  @Get('registrations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all registrations for an event (admin only)' })
  @ApiResponse({ status: 200, description: 'List of registrations' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getEventRegistrations(
    @Param('eventId') eventId: string,
    @Req() req,
  ): Promise<Registration[]> {
    return this.registrationsService.getEventRegistrations(
      eventId,
      req.user.role,
    );
  }
}

@Controller('users/me/registrations')
@ApiTags('registrations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
export class UserRegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user registrations' })
  @ApiResponse({ status: 200, description: 'List of user registrations' })
  async getUserRegistrations(@Req() req): Promise<Registration[]> {
    return this.registrationsService.getUserRegistrations(req.user.id);
  }
}
