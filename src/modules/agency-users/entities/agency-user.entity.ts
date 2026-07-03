import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AgencyUserRole, AgencyUserStatus } from '../../../common/enums';
import { Agency } from '../../agencies/entities/agency.entity';
import { User } from '../../users/entities/user.entity';

@Entity('agency_users')
@Unique(['agencyId', 'userId'])
@Index(['agencyId'])
@Index(['userId'])
@Index(['invitationToken'])
export class AgencyUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: AgencyUserRole })
  role: AgencyUserRole;

  @Column({
    type: 'enum',
    enum: AgencyUserStatus,
    default: AgencyUserStatus.ACTIVE,
  })
  status: AgencyUserStatus;

  @Column({ name: 'invitation_token', type: 'varchar', length: 255, nullable: true })
  invitationToken: string | null;

  @Column({ name: 'invitation_expires_at', type: 'timestamp', nullable: true })
  invitationExpiresAt: Date | null;

  @Column({ name: 'invited_by_user_id', type: 'uuid', nullable: true })
  invitedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Agency, (agency) => agency.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @ManyToOne(() => User, (user) => user.agencyMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invited_by_user_id' })
  invitedBy: User | null;
}
