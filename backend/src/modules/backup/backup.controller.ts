import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Req,
  Body,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('backup')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class BackupController {
  constructor(private backupService: BackupService) {}

  private async assertRestoreEnabled(req: any, target: string) {
    const allowed = await this.backupService.assertRestoreApiEnabled(req?.user?.id, target);
    if (!allowed) {
      throw new ForbiddenException(
        'Restore API dinonaktifkan pada lingkungan ini. Gunakan prosedur CLI atau SOP administratif.',
      );
    }
  }

  /**
   * POST /api/v1/backup — manual backup trigger
   * Reserved for SUPER_ADMIN (backup.manage permission)
   */
  @Post()
  @Permissions('backup.manage')
  @ApiOperation({ summary: 'Créer un backup manuel (ZIP: DB + uploads)' })
  async createManualBackup(@Req() req: any) {
    const result = await this.backupService.createBackup(req.user.id);
    return {
      message: 'Backup créé avec succès',
      ...result,
    };
  }

  /**
   * GET /api/v1/backup — list all available backups
   */
  @Get()
  @Permissions('backup.manage')
  @ApiOperation({ summary: 'Lister tous les backups disponibles' })
  async listBackups() {
    return this.backupService.listBackups();
  }

  /**
   * GET /api/v1/backup/download/:fileName — download a backup file
   */
  @Get('download/:fileName')
  @Permissions('backup.manage')
  @ApiOperation({ summary: 'Download a backup file' })
  async download(@Param('fileName') fileName: string, @Req() req: any, @Res() res: Response) {
    await this.backupService.logDownload(fileName, req.user.id);
    const filePath = this.backupService.getBackupFilePath(fileName);
    
    const match = fileName.match(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3}Z)/);
    let friendlyName = fileName;
    if (match) {
      const isoString = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}`;
      try {
        const date = new Date(isoString);
        const pad = (n: number) => String(n).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        friendlyName = `ARBAL_BACKUP_${year}-${month}-${day}_${hours}-${minutes}.zip`;
      } catch (e) {
        // Fallback
      }
    }
    
    res.download(filePath, friendlyName);
  }

  @Post('restore/:fileName')
  @Permissions('restore.manage')
  @ApiOperation({ summary: 'Restore database and uploads from a backup file' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string', minLength: 10 },
      },
    },
  })
  async restore(@Param('fileName') fileName: string, @Body('reason') reason: string, @Req() req: any) {
    await this.assertRestoreEnabled(req, fileName);
    return this.backupService.restoreFromBackup(fileName, req.user.id, reason);
  }

  /**
   * POST /api/v1/backup/upload-restore — upload a ZIP backup file and restore it
   * WARNING: This will replace current data!
   */
  @Post('upload-restore')
  @Permissions('restore.manage')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit for backup zip
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a backup ZIP file and restore database + uploads' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'reason'],
      properties: {
        file: { type: 'string', format: 'binary' },
        reason: { type: 'string', minLength: 10 },
      },
    },
  })
  async uploadAndRestore(@UploadedFile() file: Express.Multer.File, @Body('reason') reason: string, @Req() req: any) {
    await this.assertRestoreEnabled(req, file?.originalname ?? 'uploaded-file');
    return this.backupService.uploadAndRestoreBackup(file, req.user.id, reason);
  }

  /**
   * DELETE /api/v1/backup/:fileName — delete a backup file
   */
  @Delete(':fileName')
  @Permissions('backup.manage')
  @ApiOperation({ summary: 'Delete a backup file' })
  async delete(@Param('fileName') fileName: string, @Req() req: any) {
    return this.backupService.deleteBackup(fileName, req.user.id);
  }
}
