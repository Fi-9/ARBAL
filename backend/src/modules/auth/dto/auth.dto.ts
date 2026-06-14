import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@mustaqbal.sch.id' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 4 })
  @IsString()
  @MinLength(4)
  password: string;
}
