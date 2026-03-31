import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Repository } from './repository.entity';
import { Developer } from './developer.entity';

@Entity('commits')
export class Commit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  external_id: string; // SHA

  @Column({ nullable: true })
  repository_id: string;

  @ManyToOne(() => Repository)
  @JoinColumn({ name: 'repository_id' })
  repository: Repository;

  @Column({ nullable: true })
  developer_id: string;

  @ManyToOne(() => Developer)
  @JoinColumn({ name: 'developer_id' })
  developer: Developer;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ nullable: true })
  author_email: string;

  @Column({ nullable: true })
  author_name: string;

  @Column({ type: 'timestamptz' })
  committed_at: Date;

  @Column({ default: 0 })
  lines_added: number;

  @Column({ default: 0 })
  lines_deleted: number;

  @Column({ default: 0 })
  files_changed: number;

  @Column({ default: false })
  is_merge: boolean;

  @Column({ default: false })
  is_revert: boolean;

  @Column('text', { array: true, nullable: true })
  ticket_refs: string[];

  @CreateDateColumn()
  created_at: Date;
}
