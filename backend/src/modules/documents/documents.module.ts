import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { OcrService } from './ocr.service';
import { LocalStorageProvider } from './storage/local-storage.provider';

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    OcrService,
    {
      provide: 'StorageProvider',
      useClass: LocalStorageProvider,
    },
  ],
  exports: [DocumentsService, OcrService, 'StorageProvider'],
})
export class DocumentsModule {}
