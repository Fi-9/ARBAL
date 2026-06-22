import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@domainsekolah.sch.id' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'password123', minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
