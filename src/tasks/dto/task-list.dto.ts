import { TaskListItemDto } from './task-list-item.dto.js';

export class TaskListDto {
  items: TaskListItemDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
