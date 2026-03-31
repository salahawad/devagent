import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Repository } from './repository.entity';
import { Developer } from './developer.entity';

@Entity('merge_requests')
export class MergeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  external_id: string;

  @Column({ nullable: true })
  repository_id: string;

  @ManyToOne(() => Repository)
  @JoinColumn({ name: 'repository_id' })
  repository: Repository;

  @Column({ nullable: true })
  author_id: string;

  @ManyToOne(() => Developer)
  @JoinColumn({ name: 'author_id' })
  author: Developer;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ nullable: true })
  state: string;

  @Column({ type: 'timestamptz', nullable: true })
  created_at_ext: Date;

  @Column({ type: 'timestamptz', nullable: true })
  merged_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closed_at: Date;

  @Column({ default: 0 })
  review_comments_count: number;

  @Column({ default: 0 })
  approvals_count: number;

  @Column({ default: 0 })
  additions: number;

  @Column({ default: 0 })
  deletions: number;

  @Column({ nullable: true })
  turnaround_minutes: number;

  @CreateDateColumn()
  created_at: Date;
}
