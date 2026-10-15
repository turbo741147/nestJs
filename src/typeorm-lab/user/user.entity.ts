import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import type { Task } from '../task/task.entity.js';

@Entity({ name: 'users' })
export class User {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  role: string;

  @Column({ type: 'text', default: 'active' })
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany('Task', 'assignee')
  assignedTasks: Task[];
}
