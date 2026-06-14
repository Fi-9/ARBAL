import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

interface AuthedRequest extends Request {
  user: { id: string; email: string; name: string; role: string; permissions: string[] };
}

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  async findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @Permissions('student.write')
  @ApiOperation({ summary: 'Create a new student' })
  async create(@Body() body: CreateStudentDto, @Req() req: AuthedRequest) {
    return this.studentsService.create(body, req.user);
  }

  @Put(':id')
  @Permissions('student.write')
  @ApiOperation({ summary: 'Update a student' })
  async update(@Param('id') id: string, @Body() body: UpdateStudentDto, @Req() req: AuthedRequest) {
    return this.studentsService.update(id, body, req.user);
  }

  @Delete(':id')
  @Permissions('student.delete')
  async remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.studentsService.softDelete(id, req.user);
  }
}
