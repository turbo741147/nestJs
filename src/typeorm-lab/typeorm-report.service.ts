import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscalationCandidateDto } from './dto/escalation-candidate.dto.js';
import { LatestTaskDto } from './dto/latest-task.dto.js';
import { TasksByStatusDto } from './dto/tasks-by-status.dto.js';
import { Project } from './entities/project.entity.js';
import { Task } from './entities/task.entity.js';
import {
  ESCALATION_AGE_DAYS,
  ESCALATION_LIMIT_PER_PROJECT,
} from './escalation.constants.js';
import { User } from './entities/user.entity.js';

type TasksByStatusRow = {
  projectId: string;
  status: string;
  tasksCount: string | number;
};

type LatestTaskRow = {
  userId: string;
  userName: string;
  taskId: string | null;
  title: string | null;
  status: string | null;
  createdAt: Date | null;
};

type EscalationRow = {
  projectId: string;
  taskId: string;
  title: string;
  ageDays: string | number;
  priorityRank: string | number;
};

@Injectable()
export class TypeormReportService {
  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
  ) {}

  // Join и group by читаются в построителе. Необязательный projectId — параметр, не склейка строки.
  async tasksByStatus(projectId?: string): Promise<TasksByStatusDto[]> {
    if (projectId) {
      await this.requireProject(projectId);
    }

    const query = this.tasks
      .createQueryBuilder('task')
      .innerJoin('task.project', 'project')
      .select('project.id', 'projectId')
      .addSelect('task.status', 'status')
      .addSelect('COUNT(task.id)', 'tasksCount')
      .where('task.deletedAt IS NULL')
      .groupBy('project.id')
      .addGroupBy('task.status')
      .orderBy('project.id', 'ASC')
      .addOrderBy('task.status', 'ASC');

    if (projectId) {
      query.andWhere('project.id = :projectId', { projectId });
    }

    const rows = await query.getRawMany<TasksByStatusRow>();
    return rows.map((row) => ({
      projectId: row.projectId,
      status: row.status,
      tasksCount: Number(row.tasksCount),
    }));
  }

  // DISTINCT ON привязан к ORDER BY. В построителе эта связь теряется, в SQL она видна сразу.
  async latestTaskPerUser(): Promise<LatestTaskDto[]> {
    const rows = await this.tasks.manager
      .createQueryBuilder(User, 'user')
      .leftJoin('user.assignedTasks', 'task', 'task.deletedAt IS NULL')
      .select('user.id', 'userId')
      .addSelect('user.name', 'userName')
      .addSelect('task.id', 'taskId')
      .addSelect('task.title', 'title')
      .addSelect('task.status', 'status')
      .addSelect('task.createdAt', 'createdAt')
      .distinctOn(['user.id'])
      .orderBy('user.id', 'ASC')
      .addOrderBy('task.createdAt', 'DESC', 'NULLS LAST')
      .addOrderBy('task.id', 'DESC')
      .getRawMany<LatestTaskRow>();

    return rows.map((row) => ({
      userId: row.userId,
      userName: row.userName,
      taskId: row.taskId,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt,
    }));
  }

  // Два CTE вешаются на один построитель: вложенный addCommonTableExpression TypeORM не поддерживает.
  // ROW_NUMBER остаётся SQL-выражением — отдельного метода для оконных функций нет.
  async escalationCandidates(): Promise<EscalationCandidateDto[]> {
    const ageDays = '(CURRENT_DATE - CAST(tasks.createdAt AS date))';

    const candidates = this.tasks
      .createQueryBuilder('tasks')
      .innerJoin('tasks.project', 'project')
      .select('tasks.projectId', 'projectId')
      .addSelect('tasks.id', 'taskId')
      .addSelect('tasks.title', 'title')
      .addSelect(ageDays, 'ageDays')
      .where("tasks.status <> 'done'")
      .andWhere('tasks.deletedAt IS NULL')
      .andWhere("project.status = 'active'")
      .andWhere(`${ageDays} > :ageDays`, { ageDays: ESCALATION_AGE_DAYS });

    const ranked = this.tasks.manager
      .createQueryBuilder()
      .select('candidates."projectId"', 'projectId')
      .addSelect('candidates."taskId"', 'taskId')
      .addSelect('candidates.title', 'title')
      .addSelect('candidates."ageDays"', 'ageDays')
      .addSelect(
        `ROW_NUMBER() OVER (
          PARTITION BY candidates."projectId"
          ORDER BY candidates."ageDays" DESC, candidates."taskId"
        )`,
        'priorityRank',
      )
      .from('escalation_candidates', 'candidates');

    const rows = await this.tasks.manager
      .createQueryBuilder()
      .addCommonTableExpression(candidates, 'escalation_candidates')
      .addCommonTableExpression(ranked, 'ranked')
      .select('ranked."projectId"', 'projectId')
      .addSelect('ranked."taskId"', 'taskId')
      .addSelect('ranked.title', 'title')
      .addSelect('ranked."ageDays"', 'ageDays')
      .addSelect('ranked."priorityRank"', 'priorityRank')
      .from('ranked', 'ranked')
      .where('ranked."priorityRank" <= :limit', {
        limit: ESCALATION_LIMIT_PER_PROJECT,
      })
      .orderBy('projectId', 'ASC')
      .addOrderBy('priorityRank', 'ASC')
      .getRawMany<EscalationRow>();

    return rows.map((row) => ({
      projectId: row.projectId,
      taskId: row.taskId,
      title: row.title,
      ageDays: Number(row.ageDays),
      priorityRank: Number(row.priorityRank),
    }));
  }

  private async requireProject(projectId: string): Promise<void> {
    const project = await this.projects.findOne({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }
}
