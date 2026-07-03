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
import { AgencyStatus, AgencyPlan, Governorate } from '../../../common/enums';
import { AgencyUser } from '../../agency-users/entities/agency-user.entity';
import { Car } from '../../cars/entities/car.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('agencies')
@Index(['slug'])
@Index(['governorate'])
@Index(['status'])
@Index(['plan'])
export class Agency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'cover_url', type: 'text', nullable: true })
  coverUrl: string | null;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'phone_whatsapp', type: 'varchar', length: 20, nullable: true })
  phoneWhatsapp: string | null;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'enum', enum: Governorate })
  governorate: Governorate;

  @Column({ name: 'postal_code', type: 'varchar', length: 10, nullable: true })
  postalCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ name: 'patente_number', type: 'varchar', length: 50, nullable: true })
  patenteNumber: string | null;

  @Column({ name: 'patente_url', type: 'text', nullable: true })
  patenteUrl: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  rib: string | null;

  @Column({
    type: 'enum',
    enum: AgencyStatus,
    default: AgencyStatus.PENDING_VALIDATION,
  })
  status: AgencyStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'enum', enum: AgencyPlan, default: AgencyPlan.FREE })
  plan: AgencyPlan;

  @Column({ name: 'plan_expires_at', type: 'timestamp', nullable: true })
  planExpiresAt: Date | null;

  @Column({ name: 'max_cars', type: 'int', default: 5 })
  maxCars: number;

  @Column({ name: 'max_users', type: 'int', default: 2 })
  maxUsers: number;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @Column({ name: 'total_reviews', type: 'int', default: 0 })
  totalReviews: number;

  @Column({ name: 'total_bookings', type: 'int', default: 0 })
  totalBookings: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @OneToMany(() => AgencyUser, (agencyUser) => agencyUser.agency)
  members: AgencyUser[];

  @OneToMany(() => Car, (car) => car.agency)
  cars: Car[];

  @OneToMany(() => Booking, (booking) => booking.agency)
  bookings: Booking[];

  @OneToMany(() => Payment, (payment) => payment.agency)
  payments: Payment[];

  @OneToMany(() => Review, (review) => review.agency)
  reviews: Review[];

  @OneToMany(() => Notification, (notification) => notification.agency)
  notifications: Notification[];
}
