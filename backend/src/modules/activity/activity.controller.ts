import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@Controller('logs')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get()
  @Permissions('logs.view')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.activityService.findAll(page, limit);
  }

  // POST /logs has been removed (Phase 2 — Audit Log Integrity).
  // All audit log entries are now created exclusively by backend services
  // (auth, students, documents, users, backup) to prevent actor spoofing.
}
