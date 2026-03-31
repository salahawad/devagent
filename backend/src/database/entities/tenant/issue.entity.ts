import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Developer } from './developer.entity';

@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  external_id: string;

  @Column({ nullable: true })
  external_key: string; // e.g. DEV-1745

  @Column()
  provider: string;

  @Column({ nullable: true })
  assignee_id: string;

  @ManyToOne(() => Developer)
  @JoinColumn({ name: 'assignee_id' })
  assignee: Developer;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ nullable: true })
  type: string; // story, bug, task

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  status_category: string; // todo, in_progress, done

  @Column({ nullable: true })
  priority: string;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  story_points: number;

  @Column({ nullable: true })
  sprint_name: string;

  @Column({ type: 'timestamptz', nullable: true })
  sprint_start: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sprint_end: Date;

  @Column({ type: 'timestamptz', nullable: true })
  created_at_ext: Date;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at_ext: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
