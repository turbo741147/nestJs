import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { taskStatuses, type TaskStatus } from './task-status.js';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(taskStatuses)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assigneeId?: string;
}
