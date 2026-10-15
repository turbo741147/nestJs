import { Injectable, NotFoundException } from '@nestjs/common';
import { EscalationCandidateDto } from './dto/escalation-candidate.dto.js';
import { LatestTaskDto } from './dto/latest-task.dto.js';
import { TasksByStatusDto } from './dto/tasks-by-status.dto.js';
import { ProjectRepository } from './project/project.repository.js';
import { TaskRepository } from './task/task.repository.js';
import { UserRepository } from './user/user.repository.js';

@Injectable()
export class TypeormReportService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly projects: ProjectRepository,
    private readonly users: UserRepository,
  ) {}

  async tasksByStatus(projectId?: string): Promise<TasksByStatusDto[]> {
    if (projectId) {
      await this.requireProject(projectId);
    }

    const rows = await this.tasks.countByStatus(projectId);
    return rows.map((row) => ({
      projectId: row.projectId,
      status: row.status,
      tasksCount: Number(row.tasksCount),
    }));
  }

  async latestTaskPerUser(): Promise<LatestTaskDto[]> {
    const rows = await this.users.findLatestTaskPerUser();
    return rows.map((row) => ({
      userId: row.userId,
      userName: row.userName,
      taskId: row.taskId,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt,
    }));
  }

  async escalationCandidates(): Promise<EscalationCandidateDto[]> {
    const rows = await this.tasks.findEscalationCandidates();
    return rows.map((row) => ({
      projectId: row.projectId,
      taskId: row.taskId,
      title: row.title,
      ageDays: Number(row.ageDays),
      priorityRank: Number(row.priorityRank),
    }));
  }

  private async requireProject(projectId: string): Promise<void> {
    const project = await this.projects.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }
}
