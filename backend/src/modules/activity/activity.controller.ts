import { Controller, Get, Post, Query, Body, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { CreateLogDto } from './dto/activity.dto';
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

  @Post()
  @ApiOperation({ summary: 'Create an activity log entry' })
  async create(@Body() body: CreateLogDto) {
    return this.activityService.create(body);
  }
}
