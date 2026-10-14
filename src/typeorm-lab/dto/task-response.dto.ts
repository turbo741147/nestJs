export class TaskResponseDto {
  id: string;
  title: string;
  description: string | null;
  status: string;
  projectId: string;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}
