import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('repositories')
export class Repository {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  external_id: string;

  @Column()
  provider: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  full_name: string;

  @Column({ type: 'text', nullable: true })
  url: string;

  @Column({ nullable: true })
  default_branch: string;

  @Column({ default: true })
  is_tracked: boolean;

  @CreateDateColumn()
  created_at: Date;
}
