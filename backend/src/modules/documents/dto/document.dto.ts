import { IsIn, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class UpdateDocumentStatusDto {
  @ApiProperty({ enum: ['UPLOADED', 'VERIFIED', 'REJECTED'] })
  @IsIn(['UPLOADED', 'VERIFIED', 'REJECTED'])
  status: 'UPLOADED' | 'VERIFIED' | 'REJECTED';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UploadDocumentDto {
  @ApiProperty({ description: 'Student ID to associate this document with' })
  @IsString()
  studentId: string;

  @ApiProperty({ enum: DocumentType, description: 'Document type category' })
  @IsEnum(DocumentType)
  type: DocumentType;
}

export class UpdateDocumentReviewStatusDto {
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}
