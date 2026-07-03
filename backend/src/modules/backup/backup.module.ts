import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { TempBackupController } from './temp-backup.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [BackupController, TempBackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
