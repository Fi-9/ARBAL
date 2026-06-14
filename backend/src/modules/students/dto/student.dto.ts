import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'STU_001' })
  @IsString()
  id: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  nisn: string;

  @ApiProperty({ example: 'Ahmad Fauzi' })
  @IsString()
  nama: string;

  @ApiProperty({ example: 'XII RPL 1' })
  @IsString()
  kelas: string;

  @ApiProperty({ example: 'Rekayasa Perangkat Lunak' })
  @IsString()
  jurusan: string;

  @ApiProperty({ example: 'ahmad@school.id' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '081234567890' })
  @IsString()
  telepon: string;

  @ApiProperty({ example: 'Jl. Merdeka No. 10' })
  @IsString()
  alamat: string;

  @ApiProperty({ example: '2008-05-15' })
  @IsDateString()
  tanggalLahir: string;

  @ApiPropertyOptional({ example: 'Catatan tambahan' })
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nisn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kelas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jurusan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telepon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alamat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalLahir?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;

  @ApiPropertyOptional({ enum: ['AKTIF', 'ALUMNI', 'PINDAHAN', 'NON_AKTIF'] })
  @IsOptional()
  @IsString()
  status?: string;
}
