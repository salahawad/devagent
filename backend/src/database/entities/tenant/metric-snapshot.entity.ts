import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Developer } from './developer.entity';

@Entity('metric_snapshots')
export class MetricSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  developer_id: string;

  @ManyToOne(() => Developer)
  @JoinColumn({ name: 'developer_id' })
  developer: Developer;

  @Column({ type: 'date' })
  period_start: string;

  @Column({ type: 'date' })
  period_end: string;

  // Git metrics
  @Column({ default: 0 })
  total_commits: number;

  @Column({ default: 0 })
  feature_commits: number;

  @Column({ default: 0 })
  fix_commits: number;

  @Column({ default: 0 })
  merge_commits: number;

  @Column({ default: 0 })
  revert_commits: number;

  @Column({ default: 0 })
  lines_added: number;

  @Column({ default: 0 })
  lines_deleted: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  code_churn_pct: number;

  @Column({ default: 0 })
  active_days: number;

  @Column('text', { array: true, nullable: true })
  repos_contributed: string[];

  // PM metrics
  @Column({ default: 0 })
  total_issues: number;

  @Column({ default: 0 })
  completed_issues: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  story_points_total: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  story_points_completed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  completion_rate: number;

  @Column({ type: 'decimal', precision: 7, scale: 2, nullable: true })
  avg_cycle_time_days: number;

  @Column({ type: 'decimal', precision: 7, scale: 2, nullable: true })
  median_cycle_time_days: number;

  @Column({ type: 'decimal', precision: 7, scale: 2, nullable: true })
  avg_lead_time_days: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  carry_over_rate: number;

  @Column({ default: 0 })
  wip_count: number;

  @Column({ default: 0 })
  blocked_count: number;

  // Work patterns
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  morning_pct: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  afternoon_pct: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  evening_pct: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  late_night_pct: number;

  @Column({ nullable: true })
  peak_hours: string;

  @Column({ nullable: true })
  busiest_day: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  multi_project_day_pct: number;

  // MR metrics
  @Column({ default: 0 })
  mr_count: number;

  @Column({ nullable: true })
  avg_mr_turnaround_minutes: number;

  @Column({ default: 0 })
  review_comments_given: number;

  // Traceability
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  traceability_pct: number;

  // CI/CD
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  ci_pass_rate: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  computed_at: Date;
}
