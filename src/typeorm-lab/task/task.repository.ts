import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, IsNull, Repository } from 'typeorm';
import {
  ESCALATION_AGE_DAYS,
  ESCALATION_LIMIT_PER_PROJECT,
} from '../escalation.constants.js';
import { Task } from './task.entity.js';

type TasksByStatusRow = {
  projectId: string;
  status: string;
  tasksCount: string | number;
};

type EscalationRow = {
  projectId: string;
  taskId: string;
  title: string;
  ageDays: string | number;
  priorityRank: string | number;
};

@Injectable()
export class TaskRepository {
  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
  ) {}

  create(data: DeepPartial<Task>): Task {
    return this.tasks.create(data);
  }

  save(task: Task): Promise<Task> {
    return this.tasks.save(task);
  }

  findActiveByProject(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<Task[]> {
    return this.tasks.find({
      where: { projectId, deletedAt: IsNull() },
      order: { createdAt: 'DESC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  findActiveById(id: string): Promise<Task | null> {
    return this.tasks.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.tasks.delete(id);
  }

  // Join и group by читаются в построителе. Необязательный projectId — параметр, не склейка строки.
  countByStatus(projectId?: string): Promise<TasksByStatusRow[]> {
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

    return query.getRawMany<TasksByStatusRow>();
  }

  // Два CTE вешаются на один построитель: вложенный addCommonTableExpression TypeORM не поддерживает.
  // ROW_NUMBER остаётся SQL-выражением — отдельного метода для оконных функций нет.
  findEscalationCandidates(): Promise<EscalationRow[]> {
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

    return this.tasks.manager
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
  }
}
