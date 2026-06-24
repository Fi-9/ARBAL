import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  /**
   * GET /api/v1/dashboard/stats — statistiques temps réel depuis PostgreSQL
   */
  @Get('stats')
  @Permissions('dashboard.view')
  @ApiOperation({ summary: 'Get real-time dashboard statistics from the database' })
  async getStats() {
    return this.dashboardService.getStats();
  }
}
