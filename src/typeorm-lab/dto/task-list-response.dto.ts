import { TaskResponseDto } from './task-response.dto.js';

export class TaskListResponseDto {
  items: TaskResponseDto[];
  limit: number;
  offset: number;
}
