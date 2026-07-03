import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { ActivityModule } from '../activity/activity.module';
import { BackupModule } from '../backup/backup.module';

@Module({
  imports: [ActivityModule, BackupModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
