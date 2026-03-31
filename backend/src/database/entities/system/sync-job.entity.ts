import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('sync_jobs')
export class SyncJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ default: 0 })
  records_synced: number;

  @Column({ default: 0 })
  progress: number; // 0-100

  @Column({ type: 'text', nullable: true })
  progress_message: string; // e.g. "Fetching commits from hapster-backend..."

  @Column({ default: 0 })
  total_steps: number;

  @Column({ default: 0 })
  current_step: number;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  created_at: Date;
}
