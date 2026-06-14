import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiProperty({ example: 'CREATE_STUDENT' })
  @IsString()
  action: string;

  @ApiProperty({ enum: ['SISWA', 'DOKUMEN', 'HAK_AKSES', 'AUTENTIKASI'] })
  @IsIn(['SISWA', 'DOKUMEN', 'HAK_AKSES', 'AUTENTIKASI'])
  category: 'SISWA' | 'DOKUMEN' | 'HAK_AKSES' | 'AUTENTIKASI';

  @ApiProperty({ example: 'Student' })
  @IsString()
  entityType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ example: 'Created student Ahmad (NISN: 123)' })
  @IsString()
  details: string;
}
