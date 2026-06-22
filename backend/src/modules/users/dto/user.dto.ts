import { IsString, IsEmail, IsOptional, IsBoolean, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Ahmad Fauzi' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'ahmad@mustaqbal.sch.id' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'GURU', enum: ['SUPER_ADMIN', 'GURU'] })
  @IsString()
  @IsIn(['SUPER_ADMIN', 'GURU'])
  roleName: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ahmad Fauzi Updated' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'newemail@mustaqbal.sch.id' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'GURU', enum: ['SUPER_ADMIN', 'GURU'] })
  @IsOptional()
  @IsString()
  @IsIn(['SUPER_ADMIN', 'GURU'])
  roleName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'NewSecurePass456!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
