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
    return rows.map((row) =>
      Object.assign(new TasksByStatusDto(), {
        projectId: row.projectId,
        status: row.status,
        tasksCount: Number(row.tasksCount),
      }),
    );
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

    return rows.map((row) =>
      Object.assign(new LatestTaskDto(), {
        userId: row.userId,
        userName: row.userName,
        taskId: row.taskId,
        title: row.title,
        status: row.status,
        createdAt: row.createdAt,
      }),
    );
  }

  // CTE и ROW_NUMBER в построителе распадаются на куски. Пороги передаются параметрами $1 и $2.
  async escalationCandidates(): Promise<EscalationCandidateDto[]> {
    const rows = await this.tasks.query<EscalationRow[]>(
      `
      WITH escalation_candidates AS (
        SELECT
          tasks.project_id,
          tasks.id AS task_id,
          tasks.title,
          (CURRENT_DATE - tasks.created_at::date) AS age_days
        FROM tasks
        INNER JOIN projects ON projects.id = tasks.project_id
        WHERE tasks.status <> 'done'
          AND tasks.deleted_at IS NULL
          AND projects.status = 'active'
          AND (CURRENT_DATE - tasks.created_at::date) > $1
      ),
      ranked AS (
        SELECT
          project_id AS "projectId",
          task_id AS "taskId",
          title,
          age_days AS "ageDays",
          ROW_NUMBER() OVER (
            PARTITION BY project_id
            ORDER BY age_days DESC, task_id
          ) AS "priorityRank"
        FROM escalation_candidates
      )
      SELECT "projectId", "taskId", title, "ageDays", "priorityRank"
      FROM ranked
      WHERE "priorityRank" <= $2
      ORDER BY "projectId", "priorityRank"
      `,
      [ESCALATION_AGE_DAYS, ESCALATION_LIMIT_PER_PROJECT],
    );

    return rows.map((row) =>
      Object.assign(new EscalationCandidateDto(), {
        projectId: row.projectId,
        taskId: row.taskId,
        title: row.title,
        ageDays: Number(row.ageDays),
        priorityRank: Number(row.priorityRank),
      }),
    );
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
