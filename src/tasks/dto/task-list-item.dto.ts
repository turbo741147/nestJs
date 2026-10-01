import { AssigneeDto } from './assignee.dto.js';
import { LabelDto } from './label.dto.js';

export class TaskListItemDto {
  id: string;
  title: string;
  status: string;
  assignee: AssigneeDto | null;
  labels: LabelDto[];
}
