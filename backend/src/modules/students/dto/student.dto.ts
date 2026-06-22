import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsInt,
  MaxLength,
  IsIn,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiPropertyOptional({ example: 'STU_001', description: 'Optional — server generates UUID if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  id?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nisn?: string;

  @ApiPropertyOptional({ example: 'NIS-2025-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nisSekolah?: string;

  @ApiPropertyOptional({ example: 'PPDB-2025-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'ay-2025-2026-default-id' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  academicYearId?: string;

  @ApiPropertyOptional({ example: 2025 })
  @IsOptional()
  @IsInt()
  angkatan?: number;

  @ApiProperty({ example: 'Ahmad Fauzi' })
  @IsString()
  @MaxLength(255)
  nama: string;

  @ApiPropertyOptional({ example: 'XII RPL 1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  kelas?: string;

  @ApiPropertyOptional({ example: 'Rekayasa Perangkat Lunak' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  jurusan?: string;

  @ApiPropertyOptional({ example: 'ahmad@school.id' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '081234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  telepon?: string;

  @ApiProperty({ example: 'Jl. Merdeka No. 10' })
  @IsString()
  @MaxLength(255)
  alamat: string;

  @ApiProperty({ example: '2008-05-15' })
  @IsDateString()
  tanggalLahir: string;

  @ApiPropertyOptional({ example: 'Catatan tambahan' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  catatan?: string;

  @ApiPropertyOptional({ example: 2028 })
  @IsOptional()
  @IsInt()
  graduationYear?: number;

  @ApiPropertyOptional({ example: 'DN-01/D-Ijazah/28/0001' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  certificateNumber?: string;

  @ApiPropertyOptional({ example: '327501xxxxxxxxxx', description: '16 digit NIK' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, { message: 'NIK harus terdiri dari 16 digit angka' })
  nik?: string;

  @ApiPropertyOptional({ example: '327501xxxxxxxxxx', description: '16 digit Nomor KK' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, { message: 'Nomor KK harus terdiri dari 16 digit angka' })
  nomorKK?: string;

  @ApiPropertyOptional({ example: 'Budi' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  namaPanggilan?: string;

  @ApiPropertyOptional({ enum: ['LAKI_LAKI', 'PEREMPUAN'] })
  @IsOptional()
  @IsString()
  @IsIn(['LAKI_LAKI', 'PEREMPUAN'])
  jenisKelamin?: 'LAKI_LAKI' | 'PEREMPUAN';

  @ApiPropertyOptional({ example: 'Jakarta' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tempatLahir?: string;

  @ApiPropertyOptional({ example: 'SMP Negeri 1 Jakarta' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  asalSekolah?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @IsInt()
  tahunLulusSebelumnya?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Anak ke harus minimal 1' })
  @Max(20, { message: 'Anak ke tidak boleh lebih dari 20' })
  anakKe?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Jumlah saudara tidak boleh negatif' })
  @Max(20, { message: 'Jumlah saudara tidak boleh lebih dari 20' })
  jumlahSaudara?: number;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  photoUrl?: string;

  @ApiPropertyOptional({ enum: ['PENDAFTAR', 'AKTIF', 'CUTI', 'LULUS', 'KELUAR', 'ALUMNI'] })
  @IsOptional()
  @IsString()
  @IsIn(['PENDAFTAR', 'AKTIF', 'CUTI', 'LULUS', 'KELUAR', 'ALUMNI'])
  status?: string;

  // Guardian fields flat in DTO
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) namaAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pekerjaanAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) ktpAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) teleponAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) namaIbu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pekerjaanIbu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) ktpIbu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) teleponIbu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) teleponOrangTua?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) alamatOrangTua?: string;

  // New Guardian fields
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pendidikanAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pendidikanIbu?: string;
  
  @ApiPropertyOptional({ enum: ['MASIH_HIDUP', 'MENINGGAL'] })
  @IsOptional()
  @IsString()
  @IsIn(['MASIH_HIDUP', 'MENINGGAL'])
  statusAyah?: 'MASIH_HIDUP' | 'MENINGGAL';

  @ApiPropertyOptional({ enum: ['MASIH_HIDUP', 'MENINGGAL'] })
  @IsOptional()
  @IsString()
  @IsIn(['MASIH_HIDUP', 'MENINGGAL'])
  statusIbu?: 'MASIH_HIDUP' | 'MENINGGAL';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) namaWali?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) hubunganWali?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) teleponWali?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) alamatWali?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nisn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nisSekolah?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  academicYearId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  angkatan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nama?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  kelas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  jurusan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  telepon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alamat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalLahir?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  catatan?: string;

  @ApiPropertyOptional({ enum: ['PENDAFTAR', 'AKTIF', 'CUTI', 'LULUS', 'KELUAR', 'ALUMNI'] })
  @IsOptional()
  @IsString()
  @IsIn(['PENDAFTAR', 'AKTIF', 'CUTI', 'LULUS', 'KELUAR', 'ALUMNI'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  graduationYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  certificateNumber?: string;

  @ApiPropertyOptional({ example: '327501xxxxxxxxxx', description: '16 digit NIK' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, { message: 'NIK harus terdiri dari 16 digit angka' })
  nik?: string;

  @ApiPropertyOptional({ example: '327501xxxxxxxxxx', description: '16 digit Nomor KK' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, { message: 'Nomor KK harus terdiri dari 16 digit angka' })
  nomorKK?: string;

  @ApiPropertyOptional({ example: 'Budi' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  namaPanggilan?: string;

  @ApiPropertyOptional({ enum: ['LAKI_LAKI', 'PEREMPUAN'] })
  @IsOptional()
  @IsString()
  @IsIn(['LAKI_LAKI', 'PEREMPUAN'])
  jenisKelamin?: 'LAKI_LAKI' | 'PEREMPUAN';

  @ApiPropertyOptional({ example: 'Jakarta' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tempatLahir?: string;

  @ApiPropertyOptional({ example: 'SMP Negeri 1 Jakarta' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  asalSekolah?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @IsInt()
  tahunLulusSebelumnya?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Anak ke harus minimal 1' })
  @Max(20, { message: 'Anak ke tidak boleh lebih dari 20' })
  anakKe?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Jumlah saudara tidak boleh negatif' })
  @Max(20, { message: 'Jumlah saudara tidak boleh lebih dari 20' })
  jumlahSaudara?: number;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  photoUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) namaAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pekerjaanAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) ktpAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) teleponAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) namaIbu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pekerjaanIbu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) ktpIbu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) teleponIbu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) teleponOrangTua?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) alamatOrangTua?: string;

  // New Guardian fields
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pendidikanAyah?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pendidikanIbu?: string;
  
  @ApiPropertyOptional({ enum: ['MASIH_HIDUP', 'MENINGGAL'] })
  @IsOptional()
  @IsString()
  @IsIn(['MASIH_HIDUP', 'MENINGGAL'])
  statusAyah?: 'MASIH_HIDUP' | 'MENINGGAL';

  @ApiPropertyOptional({ enum: ['MASIH_HIDUP', 'MENINGGAL'] })
  @IsOptional()
  @IsString()
  @IsIn(['MASIH_HIDUP', 'MENINGGAL'])
  statusIbu?: 'MASIH_HIDUP' | 'MENINGGAL';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) namaWali?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) hubunganWali?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) teleponWali?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) alamatWali?: string;

  @ApiPropertyOptional({ example: 'Kenaikan kelas dari kelas XI ke XII' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
