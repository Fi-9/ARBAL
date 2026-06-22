import { config } from 'dotenv';
// Load root .env from parent directory
import { resolve } from 'path';
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

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ensure SYSTEM user exists for audit logging of system events
  const prisma = app.get(PrismaService);
  try {
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
  } catch (err: any) {
    console.error('Failed to verify/create SYSTEM user:', err.message);
  }

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
