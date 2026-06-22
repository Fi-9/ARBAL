import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';

@Controller('health')
export class HealthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getHealth(@Req() req: Request) {
    let isSuperAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });
        if (payload && payload.role === 'SUPER_ADMIN') {
          isSuperAdmin = true;
        }
      } catch (err) {
        // Suppress verification error, treat as unauthorized
      }
    }

    if (!isSuperAdmin) {
      return { status: 'OK' };
    }

    // Detail diagnostics for SUPER_ADMIN
    const diagnostics: Record<string, any> = {
      status: 'OK',
      database: 'ERROR',
      uploads: 'ERROR',
      backups: 'ERROR',
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

    return diagnostics;
  }
}
