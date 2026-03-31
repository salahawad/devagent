import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('health_indicators')
export class HealthIndicator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  indicator: string;

  @Column()
  status: string; // green, amber, red

  @Column({ type: 'text', nullable: true })
  detail: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  computed_at: Date;
}
