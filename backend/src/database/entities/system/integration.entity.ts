import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  provider: string; // github, gitlab, jira, clickup

  @Column()
  type: string; // git, pm

  @Column('jsonb')
  config: Record<string, any>; // { base_url, token (encrypted), org, email }

  @Column({ default: 'connected' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_sync_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
