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
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  // Enforce required environment variables
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'FATAL: JWT_SECRET is not set. Refusing to start without a secure secret. ' +
      'Set JWT_SECRET in your .env file.',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  // CORS — allow Vite dev server origin
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Swagger / OpenAPI docs (available at /api/v1/docs)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ARBAL API')
    .setDescription('Arsip Mustaqbal — Student Archive System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Serve uploaded files statically (development only)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
  console.log(`ARBAL API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger docs:  http://localhost:${port}/api/v1/docs`);
}
bootstrap();
