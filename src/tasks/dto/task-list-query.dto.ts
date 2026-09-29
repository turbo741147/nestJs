import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from '../pagination.js';

const taskStatuses = ['todo', 'in_progress', 'done', 'blocked'] as const;

export class TaskListQueryDto {
  @IsOptional()
  @IsIn(taskStatuses)
  status?: (typeof taskStatuses)[number];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assigneeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
