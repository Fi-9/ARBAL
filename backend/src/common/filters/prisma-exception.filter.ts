import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Catches Prisma known errors and maps them to appropriate HTTP responses.
 *
 * P2002 → 409 Conflict (unique constraint violation)
 * P2025 → 404 Not Found (record not found)
 * P2003 → 400 Bad Request (foreign key constraint violation)
 * P2014 → 400 Bad Request (relation violation)
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        const fields = (exception.meta?.target as string[])?.join(', ') ?? 'field';
        message = `A record with this ${fields} already exists`;
        break;

      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = exception.meta?.cause as string ?? 'Record not found';
        break;

      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = `Foreign key constraint failed: ${exception.meta?.field_name ?? 'relation'}`;
        break;

      case 'P2014':
        status = HttpStatus.BAD_REQUEST;
        message = 'Relation violation: the requested operation would violate a relation constraint';
        break;

      case 'P2000':
        status = HttpStatus.BAD_REQUEST;
        message = 'Value too long for the database column';
        break;

      default:
        console.error(`[PrismaExceptionFilter] Unhandled Prisma error: ${exception.code}`, exception);
        message = `Database error (${exception.code})`;
        break;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status] ?? 'Error',
      prismaCode: exception.code,
    });
  }
}
