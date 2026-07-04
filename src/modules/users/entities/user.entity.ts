import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RoleGlobal } from '../../../common/enums';
import { AgencyUser } from '../../agency-users/entities/agency-user.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('users')
@Index(['email'])
@Index(['cin'])
@Index(['phone'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true, unique: true })
  cin: string | null;

  @Column({
    name: 'driving_license_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  drivingLicenseNumber: string | null;

  @Column({ name: 'driving_license_expiry', type: 'date', nullable: true })
  drivingLicenseExpiry: Date | null;

  @Column({ name: 'driving_license_photo_url', type: 'text', nullable: true })
  drivingLicensePhotoUrl: string | null;

  @Column({ name: 'cin_photo_url', type: 'text', nullable: true })
  cinPhotoUrl: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({
    name: 'role_global',
    type: 'enum',
    enum: RoleGlobal,
    default: RoleGlobal.CLIENT,
  })
  roleGlobal: RoleGlobal;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({
    name: 'email_verification_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  emailVerificationToken: string | null;

  @Column({
    name: 'email_verification_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  emailVerificationExpiresAt: Date | null;

  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordResetToken: string | null;

  @Column({
    name: 'password_reset_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  passwordResetExpiresAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @OneToMany(() => AgencyUser, (agencyUser) => agencyUser.user)
  agencyMemberships: AgencyUser[];

  @OneToMany(() => Booking, (booking) => booking.clientUser)
  bookings: Booking[];

  @OneToMany(() => Review, (review) => review.clientUser)
  reviews: Review[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
