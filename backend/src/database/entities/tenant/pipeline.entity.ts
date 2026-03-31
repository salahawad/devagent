import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Repository } from './repository.entity';

@Entity('pipelines')
export class Pipeline {
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
  ref: string;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  duration_seconds: number;

  @Column({ type: 'timestamptz', nullable: true })
  created_at_ext: Date;

  @CreateDateColumn()
  created_at: Date;
}
