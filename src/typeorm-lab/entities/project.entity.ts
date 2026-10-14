import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import type { Task } from './task.entity.js';

@Entity({ name: 'projects' })
export class Project {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', default: 'active' })
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany('Task', 'project')
  tasks: Task[];
}
