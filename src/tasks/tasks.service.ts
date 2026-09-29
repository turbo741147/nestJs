import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AttachLabelDto } from './dto/attach-label.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { TaskListQueryDto } from './dto/task-list-query.dto.js';
import { CommentDto, LabelDto, TaskListDto, TaskListItemDto } from './dto/task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from './paginationConst.js';

const taskListSelect = {
  id: true,
  title: true,
  status: true,
  assignee: {
    select: {
      id: true,
      email: true,
    },
  },
  labels: {
    select: {
      label: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { labelId: 'asc' },
  },
} satisfies Prisma.TaskSelect;

function toListItem(task: {
  id: string;
  title: string;
  status: string;
  assignee: { id: string; email: string } | null;
  labels: { label: { id: string; name: string } }[];
}) {
  return new TaskListItemDto({
    id: task.id,
    title: task.title,
    status: task.status,
    assignee: task.assignee,
    labels: task.labels.map((row) => row.label),
  });
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateTaskDto): Promise<TaskListItemDto> {
    await this.requireProject(projectId);
    if (dto.assigneeId) {
      await this.requireUser(dto.assigneeId);
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? 'todo',
        projectId,
        assigneeId: dto.assigneeId,
      },
      select: taskListSelect,
    });
    return toListItem(task);
  }

  async findByProject(
    projectId: string,
    query: TaskListQueryDto,
  ): Promise<TaskListDto> {
    await this.requireProject(projectId);

    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = {
      projectId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    };

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        select: taskListSelect,
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    console.log('total', total);
    console.log('tasks', tasks.length);
    return {
      items: tasks.map((task) => toListItem(task)),
      pagination: { page, pageSize, total },
    };
  }

  async update(taskId: string, dto: UpdateTaskDto): Promise<TaskListItemDto> {
    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.status === undefined &&
      dto.assigneeId === undefined
    ) {
      throw new BadRequestException('At least one field is required');
    }

    await this.requireTask(taskId);
    if (dto.assigneeId) {
      await this.requireUser(dto.assigneeId);
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        assigneeId: dto.assigneeId,
      },
      select: taskListSelect,
    });
    return toListItem(task);
  }

  async addComment(taskId: string, dto: CreateCommentDto): Promise<CommentDto> {
    await this.requireTask(taskId);
    await this.requireUser(dto.authorId);

    const comment = await this.prisma.comment.create({
      data: {
        body: dto.body,
        taskId,
        authorId: dto.authorId,
      },
      select: {
        id: true,
        body: true,
        taskId: true,
        authorId: true,
        createdAt: true,
      },
    });
    return new CommentDto(comment);
  }

  async attachLabel(taskId: string, dto: AttachLabelDto): Promise<LabelDto> {
    await this.requireTask(taskId);
    const label = await this.prisma.label.findUnique({
      where: { id: dto.labelId },
      select: { id: true, name: true },
    });
    if (!label) {
      throw new NotFoundException(`Label ${dto.labelId} not found`);
    }

    await this.prisma.taskLabel.upsert({
      where: {
        taskId_labelId: { taskId, labelId: dto.labelId },
      },
      update: {},
      create: { taskId, labelId: dto.labelId },
    });

    return Object.assign(new LabelDto(), label);
  }

  private async requireProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  private async requireTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found12ß`);
    }
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }
}
