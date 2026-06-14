import { IsIn, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class UpdateDocumentStatusDto {
  @ApiProperty({ enum: ['TERARSIP', 'VERIFIKASI', 'DITOLAK'] })
  @IsIn(['TERARSIP', 'VERIFIKASI', 'DITOLAK'])
  status: 'TERARSIP' | 'VERIFIKASI' | 'DITOLAK';
}

export class UploadDocumentDto {
  @ApiProperty({ description: 'Student ID to associate this document with' })
  @IsString()
  studentId: string;

  @ApiProperty({ enum: DocumentType, description: 'Document type category' })
  @IsEnum(DocumentType)
  type: DocumentType;
}
