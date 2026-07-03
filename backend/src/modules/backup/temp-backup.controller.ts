import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { BackupService } from './backup.service';

// Use the existing DB password as the secure token to access this temp endpoint
const TEMP_SECRET = 'kQ7IvCQUAYdjLLeI3mDmYm4k';

@Controller('temp-backup')
export class TempBackupController {
  constructor(private backupService: BackupService) {}

  private verifySecret(secret: string) {
    if (!secret || secret !== TEMP_SECRET) {
      throw new HttpException('Unauthorized temp access', HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('trigger')
  async triggerBackup(@Query('secret') secret: string) {
    this.verifySecret(secret);
    const result = await this.backupService.createBackup('SYSTEM', 'manual');
    return {
      message: 'Temporary backup triggered successfully',
      ...result,
    };
  }

  @Get('list')
  async listBackups(@Query('secret') secret: string) {
    this.verifySecret(secret);
    return this.backupService.listBackups();
  }

  @Get('download/:fileName')
  async download(
    @Param('fileName') fileName: string,
    @Query('secret') secret: string,
    @Res() res: Response,
  ) {
    this.verifySecret(secret);
    const filePath = this.backupService.getBackupFilePath(fileName);
    res.download(filePath, fileName);
  }
}
