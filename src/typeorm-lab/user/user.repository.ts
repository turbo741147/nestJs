import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

type LatestTaskRow = {
  userId: string;
  userName: string;
  taskId: string | null;
  title: string | null;
  status: string | null;
  createdAt: Date | null;
};

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({
      where: { id },
      select: { id: true },
    });
  }

  // DISTINCT ON привязан к ORDER BY. В построителе эта связь теряется, в SQL она видна сразу.
  findLatestTaskPerUser(): Promise<LatestTaskRow[]> {
    return this.users
      .createQueryBuilder('user')
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
  }
}
