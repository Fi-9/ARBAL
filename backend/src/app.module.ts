import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { ActivityModule } from './modules/activity/activity.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { BackupModule } from './modules/backup/backup.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Global rate limiting: 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([{
      ttl: 60_000,
      limit: 100,
    }]),
    PrismaModule,
    AuthModule,
    StudentsModule,
    ActivityModule,
    DocumentsModule,
    BackupModule,
    DashboardModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
