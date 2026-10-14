import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AddTaskReportIndexes1791814260000 } from './migrations/1791814260000-AddTaskReportIndexes.js';

import { Project } from './typeorm-lab/entities/project.entity.js';
import { Task } from './typeorm-lab/entities/task.entity.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

export const AppDataSource = new DataSource({ 
  type: 'postgres',
  url,
  entities: [ Project, Task],
  migrations: [
    AddTaskReportIndexes1791814260000,
  ],
  synchronize: false,
});
