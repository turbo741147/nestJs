export class LatestTaskDto {
  userId: string;
  userName: string;
  taskId: string | null;
  title: string | null;
  status: string | null;
  createdAt: Date | null;
}
