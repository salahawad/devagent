import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('sprints')
export class Sprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  external_id: string;

  @Column()
  provider: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  state: string;

  @Column({ type: 'timestamptz', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_date: Date;

  @CreateDateColumn()
  created_at: Date;
}
