import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { UsersModule } from './users/users.module.js';


@Module({
  imports: [
    PrismaModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
