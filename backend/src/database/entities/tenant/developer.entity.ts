import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('developers')
export class Developer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  external_id: string;

  @Column()
  provider: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  display_name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  role: string;

  @Column({ default: true })
  is_tracked: boolean;

  // Links this identity to a primary developer profile (null = is primary)
  @Column({ nullable: true })
  linked_to: string;

  @ManyToOne(() => Developer, { nullable: true })
  @JoinColumn({ name: 'linked_to' })
  primary_profile: Developer;

  @CreateDateColumn()
  created_at: Date;
}
