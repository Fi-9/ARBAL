import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/user.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

interface AuthedRequest extends Request {
  user: { id: string; email: string; name: string; role: string; permissions: string[] };
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Permissions('user.manage')
  @ApiOperation({ summary: 'List all users' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Get a single user by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() body: CreateUserDto, @Req() req: AuthedRequest) {
    return this.usersService.create(body, req.user.id);
  }

  @Patch(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Update user profile (name, email, role, active status)' })
  async update(@Param('id') id: string, @Body() body: UpdateUserDto, @Req() req: AuthedRequest) {
    return this.usersService.update(id, body, req.user.id);
  }

  @Post(':id/reset-password')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Reset a user password' })
  async resetPassword(@Param('id') id: string, @Body() body: ResetPasswordDto, @Req() req: AuthedRequest) {
    return this.usersService.resetPassword(id, body.newPassword, req.user.id);
  }

  @Delete(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Soft-delete a user (disable account)' })
  async remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.usersService.remove(id, req.user.id);
  }
}
