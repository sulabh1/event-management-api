//Example of the code

// import {
//   Controller,
//   Get,
//   Body,
//   Patch,
//   Param,
//   Delete,
//   UseGuards,
// } from '@nestjs/common';
// import {
//   ApiTags,
//   ApiOperation,
//   ApiResponse,
//   ApiBearerAuth,
// } from '@nestjs/swagger';
// import { UsersService } from './users.service';
// import { UpdateProfileDto } from './dtos/update-profile.dto';
// import { User } from './entities/user.entity';
// import { JWTAuthGuard } from '../../common/guards/jwt-auth.guard';
// import { RolesGuard } from '../../common/guards/roles.guard';
// import { Roles } from '../../common/decorators/roles.decorator';
// import { UserRole } from './entities/user.entity';

// @ApiTags('users')
// @Controller('users')
// @ApiBearerAuth('JWT-auth')
// @UseGuards(JWTAuthGuard, RolesGuard)
// export class UsersController {
//   constructor(private readonly usersService: UsersService) {}

//   @Get()
//   @Roles(UserRole.ADMIN)
//   @ApiOperation({ summary: 'Get all users' })
//   @ApiResponse({ status: 200, description: 'List of all users' })
//   async findAll(): Promise<User[]> {
//     return this.usersService.findAll();
//   }

//   @Get(':id')
//   @Roles(UserRole.ADMIN)
//   @ApiOperation({ summary: 'Get user by ID' })
//   @ApiResponse({ status: 200, description: 'User details' })
//   @ApiResponse({ status: 404, description: 'User not found' })
//   async findOne(@Param('id') id: string): Promise<User> {
//     return this.usersService.findOne(id);
//   }

//   @Patch(':id')
//   @Roles(UserRole.ADMIN)
//   @ApiOperation({ summary: 'Update user' })
//   @ApiResponse({ status: 200, description: 'User updated successfully' })
//   @ApiResponse({ status: 404, description: 'User not found' })
//   async update(
//     @Param('id') id: string,
//     @Body() updateUserDto: UpdateProfileDto,
//   ): Promise<User> {
//     return this.usersService.update(id, updateUserDto);
//   }

//   @Delete(':id')
//   @Roles(UserRole.ADMIN)
//   @ApiOperation({ summary: 'Delete user' })
//   @ApiResponse({ status: 200, description: 'User deleted successfully' })
//   @ApiResponse({ status: 404, description: 'User not found' })
//   async remove(@Param('id') id: string): Promise<void> {
//     return this.usersService.remove(id);
//   }
// }
