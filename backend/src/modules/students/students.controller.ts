import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
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

  @Get('academic-years')
  @Permissions('student.read')
  @ApiOperation({ summary: 'Get all academic years' })
  async findAcademicYears() {
    return this.studentsService.findAcademicYears();
  }

  @Post('academic-years')
  @Permissions('student.write')
  @ApiOperation({ summary: 'Create a new academic year' })
  async createAcademicYear(@Body('name') body: { name: string }) {
    // Support both raw string body or JSON object body for robustness
    const name = typeof body === 'object' && body !== null ? body.name : body;
    if (!name || typeof name !== 'string') {
      throw new BadRequestException('Academic year name is required as a string');
    }
    return this.studentsService.createAcademicYear(name.trim());
  }

  @Put('academic-years/:id')
  @Permissions('student.write')
  @ApiOperation({ summary: 'Update an academic year' })
  async updateAcademicYear(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.studentsService.updateAcademicYear(id, body);
  }

  @Delete('academic-years/:id')
  @Permissions('student.write')
  @ApiOperation({ summary: 'Delete an academic year' })
  async deleteAcademicYear(@Param('id') id: string) {
    return this.studentsService.deleteAcademicYear(id);
  }

  @Post('academic-years/:id/active')
  @Permissions('student.write')
  @ApiOperation({ summary: 'Set an academic year as active' })
  async setActiveAcademicYear(@Param('id') id: string) {
    return this.studentsService.setActiveAcademicYear(id);
  }

  /** GET /api/v1/students/search?q=... — Global Search */
  @Get('search')
  @Permissions('student.read')
  @ApiOperation({ summary: 'Search students by name, NIS, NISN, PPDB, or parent name' })
  async search(@Query('q') q: string, @Req() req: AuthedRequest) {
    return this.studentsService.search(q, req.user);
  }

  /** GET /api/v1/students/export?format=xlsx|csv — Export student data */
  @Get('export')
  @Permissions('report.export')
  @ApiOperation({ summary: 'Export all students as Excel (.xlsx) or CSV' })
  async export(@Query('format') format: string, @Req() req: AuthedRequest, @Res() res: Response) {
    if (format === 'xlsx') {
      const buffer = await this.studentsService.exportToExcel(req.user);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ARBAL_Data_Siswa_${new Date().toISOString().split('T')[0]}.xlsx"`,
      });
      res.send(buffer);
    } else if (format === 'csv') {
      const csv = await this.studentsService.exportToCsv(req.user);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ARBAL_Data_Siswa_${new Date().toISOString().split('T')[0]}.csv"`,
      });
      // Add BOM for Excel UTF-8 compatibility
      res.send('\uFEFF' + csv);
    } else {
      throw new BadRequestException('Format must be "xlsx" or "csv"');
    }
  }

  @Get()
  @Permissions('student.read')
  async findAll(
    @Req() req: AuthedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('kelas') kelas?: string,
    @Query('status') status?: string,
    @Query('jurusan') jurusan?: string,
    @Query('angkatan') angkatan?: string,
  ) {
    return this.studentsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      classFilter: kelas,
      statusFilter: status,
      jurusan,
      angkatan: angkatan ? parseInt(angkatan, 10) : undefined,
    }, req.user);
  }

  /** Trash Bin — GET /api/v1/students/trash (MUST be above :id) */
  @Get('trash')
  @Permissions('student.delete')
  @ApiOperation({ summary: 'List all soft-deleted students' })
  async findTrash(@Req() req: AuthedRequest) {
    return this.studentsService.findTrash(req.user);
  }

  @Get('document-requirements')
  @Permissions('student.read')
  @ApiOperation({ summary: 'Get all document requirements' })
  async findDocumentRequirements() {
    return this.studentsService.findDocumentRequirements();
  }

  @Put('document-requirements/:id')
  @Permissions('student.write')
  @ApiOperation({ summary: 'Update a document requirement' })
  async updateDocumentRequirement(
    @Param('id') id: string,
    @Body('isRequired') isRequired: boolean,
  ) {
    if (typeof isRequired !== 'boolean') {
      throw new BadRequestException('isRequired must be a boolean');
    }
    return this.studentsService.updateDocumentRequirement(id, isRequired);
  }

  @Get(':id')
  @Permissions('student.read')
  async findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.studentsService.findOne(id, req.user);
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

  /** Restore — POST /api/v1/students/:id/restore */
  @Post(':id/restore')
  @Permissions('student.delete')
  @ApiOperation({ summary: 'Restore a soft-deleted student' })
  async restore(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.studentsService.restore(id, req.user);
  }

  /** Permanent Delete — DELETE /api/v1/students/:id/permanent */
  @Delete(':id/permanent')
  @Permissions('student.delete')
  @ApiOperation({ summary: 'Permanently delete a student and all associated data' })
  async permanentDelete(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.studentsService.permanentDelete(id, req.user);
  }

  @Get(':id/timeline')
  @Permissions('student.read')
  @ApiOperation({ summary: 'Get student timeline' })
  async findTimeline(@Param('id') id: string) {
    return this.studentsService.findTimeline(id);
  }

  @Get(':id/status-history')
  @Permissions('student.read')
  @ApiOperation({ summary: 'Get student status history' })
  async findStatusHistory(@Param('id') id: string) {
    return this.studentsService.findStatusHistory(id);
  }

  @Get(':id/notes')
  @Permissions('student.read')
  @ApiOperation({ summary: 'Get all notes for a student' })
  async findNotes(@Param('id') id: string) {
    return this.studentsService.findNotes(id);
  }

  @Post(':id/notes')
  @Permissions('student.write')
  @ApiOperation({ summary: 'Create a student note' })
  async createNote(
    @Param('id') studentId: string,
    @Body() body: { content: string; visibility?: 'INTERNAL' | 'PUBLIC'; isPinned?: boolean },
    @Req() req: AuthedRequest,
  ) {
    if (!body.content || typeof body.content !== 'string') {
      throw new BadRequestException('Content is required');
    }
    return this.studentsService.createNote(studentId, req.user.id, body);
  }

  @Put('notes/:noteId')
  @Permissions('student.write')
  @ApiOperation({ summary: 'Update a student note' })
  async updateNote(
    @Param('noteId') noteId: string,
    @Body() body: { content?: string; visibility?: 'INTERNAL' | 'PUBLIC'; isPinned?: boolean },
  ) {
    return this.studentsService.updateNote(noteId, body);
  }

  @Delete('notes/:noteId')
  @Permissions('student.write')
  @ApiOperation({ summary: 'Delete a student note' })
  async deleteNote(@Param('noteId') noteId: string) {
    return this.studentsService.deleteNote(noteId);
  }
}
