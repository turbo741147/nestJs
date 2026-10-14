import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TasksByStatusQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  projectId?: string;
}
