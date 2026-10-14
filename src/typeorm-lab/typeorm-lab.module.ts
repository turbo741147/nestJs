import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity.js';
import { Task } from './entities/task.entity.js';
import { User } from './entities/user.entity.js';
import { TypeormLabController } from './typeorm-lab.controller.js';
import { TypeormReportService } from './typeorm-report.service.js';
import { TypeormTaskService } from './typeorm-task.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Task])],
  controllers: [TypeormLabController],
  providers: [TypeormTaskService, TypeormReportService],
})
export class TypeormLabModule {}
