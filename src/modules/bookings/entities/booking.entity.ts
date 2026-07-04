import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Check,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { BookingStatus, BookingSource, CancelledBy } from '../../../common/enums';
import { Agency } from '../../agencies/entities/agency.entity';
import { Car } from '../../cars/entities/car.entity';
import { User } from '../../users/entities/user.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('bookings')
@Check(`"end_date" > "start_date"`)
@Index(['agencyId'])
@Index(['carId'])
@Index(['clientUserId'])
@Index(['status'])
@Index(['startDate'])
@Index(['endDate'])
@Index(['bookingReference'])
@Index(['carId', 'status', 'startDate', 'endDate'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_reference', type: 'varchar', length: 20, unique: true })
  bookingReference: string;

  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @Column({ name: 'car_id', type: 'uuid' })
  carId: string;

  @Column({ name: 'client_user_id', type: 'uuid', nullable: true })
  clientUserId: string | null;

  @Column({ name: 'client_first_name', type: 'varchar', length: 100 })
  clientFirstName: string;

  @Column({ name: 'client_last_name', type: 'varchar', length: 100 })
  clientLastName: string;

  @Column({ name: 'client_email', type: 'varchar', length: 255 })
  clientEmail: string;

  @Column({ name: 'client_phone', type: 'varchar', length: 20 })
  clientPhone: string;

  @Column({ name: 'client_cin', type: 'varchar', length: 8, nullable: true })
  clientCin: string | null;

  @Column({ name: 'client_driving_license', type: 'varchar', length: 50, nullable: true })
  clientDrivingLicense: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'total_days', type: 'smallint' })
  totalDays: number;

  @Column({ name: 'pickup_location', type: 'text' })
  pickupLocation: string;

  @Column({ name: 'dropoff_location', type: 'text' })
  dropoffLocation: string;

  @Column({ name: 'price_per_day', type: 'decimal', precision: 10, scale: 2 })
  pricePerDay: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  depositAmount: number | null;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ name: 'cancelled_by', type: 'enum', enum: CancelledBy, nullable: true })
  cancelledBy: CancelledBy | null;

  @Column({ name: 'client_notes', type: 'text', nullable: true })
  clientNotes: string | null;

  @Column({ name: 'agency_notes', type: 'text', nullable: true })
  agencyNotes: string | null;

  @Column({ name: 'confirmed_by', type: 'uuid', nullable: true })
  confirmedBy: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'pickup_at', type: 'timestamp', nullable: true })
  pickupAt: Date | null;

  @Column({ name: 'dropoff_at', type: 'timestamp', nullable: true })
  dropoffAt: Date | null;

  @Column({ type: 'enum', enum: BookingSource, default: BookingSource.MARKETPLACE })
  source: BookingSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Agency, (agency) => agency.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @ManyToOne(() => Car, (car) => car.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'car_id' })
  car: Car;

  @ManyToOne(() => User, (user) => user.bookings, { nullable: true })
  @JoinColumn({ name: 'client_user_id' })
  clientUser: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'confirmed_by' })
  confirmedByUser: User | null;

  @OneToOne(() => Review, (review) => review.booking)
  review: Review;

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Payment[];
}
