import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Issue } from './issue.entity';

@Entity('issue_transitions')
export class IssueTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  issue_id: string;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issue_id' })
  issue: Issue;

  @Column({ nullable: true })
  from_status: string;

  @Column({ nullable: true })
  to_status: string;

  @Column({ type: 'timestamptz' })
  transitioned_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
