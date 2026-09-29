import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const taskStatuses = ['todo', 'in_progress', 'done', 'blocked'] as const;

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(taskStatuses)
  status?: (typeof taskStatuses)[number];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assigneeId?: string;
}
