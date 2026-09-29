import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AttachLabelDto } from './dto/attach-label.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { TaskListQueryDto } from './dto/task-list-query.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TasksService } from './tasks.service.js';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:projectId/tasks')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, dto);
  }

  @Get('projects/:projectId/tasks')
  findByProject(
    @Param('projectId') projectId: string,
    @Query() query: TaskListQueryDto,
  ) {
    return this.tasksService.findByProject(projectId, query);
  }

  @Patch('tasks/:taskId')
  update(@Param('taskId') taskId: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(taskId, dto);
  }

  @Post('tasks/:taskId/comments')
  addComment(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.tasksService.addComment(taskId, dto);
  }

  @Post('tasks/:taskId/labels')
  attachLabel(
    @Param('taskId') taskId: string,
    @Body() dto: AttachLabelDto,
  ) {
    return this.tasksService.attachLabel(taskId, dto);
  }
}
