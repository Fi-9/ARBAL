import { config } from 'dotenv';
// Load root .env from parent directory
import { resolve, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
config({ path: resolve(__dirname, '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  // Enforce required environment variables
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'FATAL: JWT_SECRET is not set. Refusing to start without a secure secret. ' +
      'Set JWT_SECRET in your .env file.',
    );
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      'FATAL: JWT_REFRESH_SECRET is not set. Refusing to start without a secure secret. ' +
      'Set JWT_REFRESH_SECRET in your .env file.',
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'FATAL: DATABASE_URL is not set. Set DATABASE_URL in your .env file.',
    );
  }

  // Verify UPLOADS_DIR and BACKUPS_DIR exist and are writable
  const uploadsDir = process.env.UPLOADS_DIR
    ? resolve(process.env.UPLOADS_DIR)
    : resolve(__dirname, '..', 'uploads');

  const backupsDir = process.env.BACKUPS_DIR
    ? resolve(process.env.BACKUPS_DIR)
    : resolve(__dirname, '..', 'backups');

  const verifyWritability = (dirPath: string, label: string) => {
    try {
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
      const testFile = join(dirPath, `.startup-write-test-${Date.now()}`);
      writeFileSync(testFile, 'test');
      unlinkSync(testFile);
    } catch (err: any) {
      console.error(`FATAL: Directory ${label} at "${dirPath}" is not writable:`, err.message);
      process.exit(1);
    }
  };

  verifyWritability(uploadsDir, 'UPLOADS_DIR');
  verifyWritability(backupsDir, 'BACKUPS_DIR');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ensure SYSTEM user exists for audit logging of system events
  const prisma = app.get(PrismaService);
  try {
    // Ensure all standard roles exist in database
    const rolesToEnsure = ['SUPER_ADMIN', 'GURU', 'KEPALA_SEKOLAH', 'TATA_USAHA'];
    for (const rName of rolesToEnsure) {
      await prisma.role.upsert({
        where: { name: rName as any },
        update: {},
        create: {
          id: `role-${rName.toLowerCase().replace(/_/g, '-')}`,
          name: rName as any,
        },
      });
    }

    const systemUser = await prisma.user.findUnique({ where: { id: 'SYSTEM' } });
    if (!systemUser) {
      let role = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
      if (!role) {
        role = await prisma.role.create({
          data: { id: 'role-super_admin', name: 'SUPER_ADMIN' },
        });
      }
      await prisma.user.create({
        data: {
          id: 'SYSTEM',
          name: 'SYSTEM',
          email: 'system@arbal.local',
          passwordHash: 'SYSTEM_LOCKED_ACCOUNT',
          isActive: false, // Inactive system account, cannot login
          roleId: role.id,
        },
      });
      console.log('🌱 Created SYSTEM user for automated system event audit logs.');
    }

    // Seed default admin account if no real users exist (except SYSTEM) for bootstrap/recovery
    const userCount = await prisma.user.count({ where: { NOT: { id: 'SYSTEM' } } });
    if (userCount === 0) {
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || crypto.randomBytes(16).toString('base64url');
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const role = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
      if (role) {
        await prisma.user.create({
          data: {
            id: 'admin-user-default-id',
            name: 'Admin ARBAL',
            email: 'admin@arbal.local',
            passwordHash,
            isActive: true,
            roleId: role.id,
          },
        });
        console.log('🌱 Seeded default admin user (admin@arbal.local)');
        console.log(`🔑 Admin password: ${adminPassword}`);
        if (!process.env.ADMIN_BOOTSTRAP_PASSWORD) {
          console.log('⚠️  Password was auto-generated. Set ADMIN_BOOTSTRAP_PASSWORD in .env to control this.');
        }
      }
    }
  } catch (err: any) {
    console.error('Failed to verify/create SYSTEM or default admin user:', err.message);
  }

  // Seed default classes if table is empty
  try {
    const classCount = await prisma.class.count();
    if (classCount === 0) {
      const defaultClasses = [
        { name: 'Kelas X', description: 'Kelas X PKBM Mustaqbal' },
        { name: 'Kelas XI', description: 'Kelas XI PKBM Mustaqbal' },
        { name: 'Kelas XII', description: 'Kelas XII PKBM Mustaqbal' },
        { name: 'Paket A', description: 'Program Kesetaraan Paket A (SD)' },
        { name: 'Paket B', description: 'Program Kesetaraan Paket B (SMP)' },
        { name: 'Paket C', description: 'Program Kesetaraan Paket C (SMA)' },
        { name: 'Alumni', description: 'Siswa yang telah menyelesaikan studi' },
      ];
      await prisma.class.createMany({
        data: defaultClasses,
      });
      console.log('🌱 Seeded default classes.');
    }
  } catch (err: any) {
    console.error('Failed to seed default classes:', err.message);
  }

  // Print Backup Scheduler Configuration
  console.log('⏰ Backup Scheduler Initialized:');
  console.log('   - Harian: Pukul 01:00 WIB');
  console.log('   - Mingguan: Pukul 02:00 WIB');
  console.log('   - Bulanan: Pukul 03:00 WIB');

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // Global validation pipe — reject unknown/invalid fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter for Prisma errors
  app.useGlobalFilters(new PrismaExceptionFilter());

  // CORS — configurable via environment variable
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Swagger / OpenAPI docs — only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ARBAL API')
      .setDescription('Arsip Mustaqbal — Student Archive System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  // Serve uploaded files statically — only through the JWT-guarded /documents/:id/file endpoint
  // (do NOT expose uploads/ directory publicly)

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
  console.log(`ARBAL API running on http://localhost:${port}/api/v1`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger docs:  http://localhost:${port}/api/v1/docs`);
  }
}
bootstrap();
