import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { userRoles, userStatuses } from '../user.constants.js';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(userRoles)
  role: (typeof userRoles)[number];

  @IsOptional()
  @IsIn(userStatuses)
  status?: (typeof userStatuses)[number];
}
