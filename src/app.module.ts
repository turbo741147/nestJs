import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { TypeormLabModule } from './typeorm-lab/typeorm-lab.module.js';
import { UsersModule } from './users/users.module.js';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: process.env.DATABASE as 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
    }),
    PrismaModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    TypeormLabModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
