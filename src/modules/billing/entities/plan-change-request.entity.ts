import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AgencyPlan, PlanChangeRequestStatus } from '../../../common/enums';
import { Agency } from '../../agencies/entities/agency.entity';
import { User } from '../../users/entities/user.entity';

@Entity('plan_change_requests')
@Index(['agencyId'])
@Index(['status'])
export class PlanChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedById: string;

  @Column({ name: 'current_plan', type: 'enum', enum: AgencyPlan })
  currentPlan: AgencyPlan;

  @Column({ name: 'requested_plan', type: 'enum', enum: AgencyPlan })
  requestedPlan: AgencyPlan;

  @Column({
    name: 'monthly_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  monthlyPrice: number;

  @Column({
    type: 'enum',
    enum: PlanChangeRequestStatus,
    default: PlanChangeRequestStatus.PENDING,
  })
  status: PlanChangeRequestStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ name: 'processed_by', type: 'uuid', nullable: true })
  processedById: string | null;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requestedBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedBy: User | null;
}
