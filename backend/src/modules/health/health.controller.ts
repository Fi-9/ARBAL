import { Controller, Get, Req, ServiceUnavailableException } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
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
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getHealth() {
    const diagnostics: Record<string, any> = {
      status: 'OK',
      database: 'ERROR',
      uploads: 'ERROR',
      backups: 'ERROR',
      diskFree: '-',
      version: process.env.APP_VERSION || '1.0.0',
      build: process.env.APP_BUILD || 'development',
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
