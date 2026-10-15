import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project/project.entity.js';
import { ProjectRepository } from './project/project.repository.js';
import { Task } from './task/task.entity.js';
import { TaskRepository } from './task/task.repository.js';
import { TypeormLabController } from './typeorm-lab.controller.js';
import { TypeormReportService } from './typeorm-report.service.js';
import { TypeormTaskService } from './typeorm-task.service.js';
import { User } from './user/user.entity.js';
import { UserRepository } from './user/user.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Task])],
  controllers: [TypeormLabController],
  providers: [
    ProjectRepository,
    TaskRepository,
    UserRepository,
    TypeormTaskService,
    TypeormReportService,
  ],
})
export class TypeormLabModule {}
