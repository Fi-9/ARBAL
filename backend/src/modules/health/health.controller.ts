import { Controller, Get, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/v1/health
   * Public endpoint for status checks (uptime, version, status)
   */
  @Get()
  async getHealth() {
    // Light check database connectivity
    let dbStatus = 'OK';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'ERROR';
    }

    if (dbStatus === 'ERROR') {
      throw new ServiceUnavailableException({
        status: 'ERROR',
        database: 'ERROR',
        uptime: process.uptime(),
        version: process.env.APP_VERSION || '1.0.0',
        build: process.env.APP_BUILD || 'production',
      });
    }

    return {
      status: 'OK',
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      build: process.env.APP_BUILD || 'production',
    };
  }

  /**
   * GET /api/v1/health/details
   * Protected detailed diagnostics endpoint for SUPER_ADMIN
   */
  @Get('details')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('backup.manage')
  async getHealthDetails() {
    const diagnostics: Record<string, any> = {
      status: 'OK',
      database: 'ERROR',
      uploads: 'ERROR',
      backups: 'ERROR',
      diskFree: '-',
      version: process.env.APP_VERSION || '1.0.0',
      build: process.env.APP_BUILD || 'production',
    };

    // 1. Check Database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      diagnostics.database = 'OK';
    } catch (dbErr) {
      diagnostics.database = 'ERROR';
      diagnostics.status = 'ERROR';
    }

    // 2. Check Uploads directory writability
    const uploadsDir = process.env.UPLOADS_DIR || resolve(__dirname, '..', '..', '..', 'uploads');
    try {
      const testFile = join(uploadsDir, `.healthcheck-${Date.now()}`);
      writeFileSync(testFile, 'test');
      unlinkSync(testFile);
      diagnostics.uploads = 'OK';
    } catch (err) {
      diagnostics.uploads = 'ERROR';
      diagnostics.status = 'ERROR';
    }

    // 3. Check Backups directory writability
    const backupsDir = resolve(__dirname, '..', '..', '..', 'backups');
    try {
      const testFile = join(backupsDir, `.healthcheck-${Date.now()}`);
      writeFileSync(testFile, 'test');
      unlinkSync(testFile);
      diagnostics.backups = 'OK';
    } catch (err) {
      diagnostics.backups = 'ERROR';
      diagnostics.status = 'ERROR';
    }

    // 4. Check disk free space
    try {
      const { statfsSync } = require('fs');
      const stats = statfsSync(backupsDir);
      const freeSpace = stats.bavail * stats.bsize;
      diagnostics.diskFree = formatBytes(freeSpace);
    } catch {
      // Fallback
    }

    if (diagnostics.status === 'ERROR') {
      throw new ServiceUnavailableException(diagnostics);
    }

    return diagnostics;
  }
}
