import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const projectStatuses = ['active', 'archived'] as const;

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(projectStatuses)
  status?: (typeof projectStatuses)[number];
}
