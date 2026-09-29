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

  constructor(task: {
    id: string;
    title: string;
    status: string;
    assignee: { id: string; email: string } | null;
    labels: { id: string; name: string }[];
  }) {
    this.id = task.id;
    this.title = task.title;
    this.status = task.status;
    this.assignee = task.assignee
      ? Object.assign(new AssigneeDto(), task.assignee)
      : null;
    this.labels = task.labels.map((label) =>
      Object.assign(new LabelDto(), label),
    );
  }
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

  constructor(comment: {
    id: string;
    body: string;
    taskId: string;
    authorId: string;
    createdAt: Date;
  }) {
    this.id = comment.id;
    this.body = comment.body;
    this.taskId = comment.taskId;
    this.authorId = comment.authorId;
    this.createdAt = comment.createdAt;
  }
}
