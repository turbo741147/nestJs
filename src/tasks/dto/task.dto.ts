export class AssigneeDto {
  id: string;
  email: string;
}

export class LabelDto {
  id: string;
  name: string;
}

export class TaskListItemDto {
  id: string;
  title: string;
  status: string;
  assignee: AssigneeDto | null;
  labels: LabelDto[];
}

export class TaskListDto {
  items: TaskListItemDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export class CommentDto {
  id: string;
  body: string;
  taskId: string;
  authorId: string;
  createdAt: Date;
}
