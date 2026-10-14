import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { Project } from './project.entity.js';
import type { User } from './user.entity.js';

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', default: 'todo' })
  status: string;

  @Column({ name: 'project_id', type: 'text' })
  projectId: string;

  @ManyToOne('Project', 'tasks')
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'assignee_id', type: 'text', nullable: true })
  assigneeId: string | null;

  @ManyToOne('User', 'assignedTasks', { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User | null;

  @Column({ name: 'created_by_id', type: 'text', nullable: true })
  createdById: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
