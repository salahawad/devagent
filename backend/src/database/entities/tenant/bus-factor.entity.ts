import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Repository } from './repository.entity';
import { Developer } from './developer.entity';

@Entity('bus_factor')
export class BusFactor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commit_pct: number;

  @Column({ nullable: true })
  bus_factor_score: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  computed_at: Date;
}
