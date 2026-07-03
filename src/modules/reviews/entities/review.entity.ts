import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Check,
  OneToOne,
} from 'typeorm';
import { Agency } from '../../agencies/entities/agency.entity';
import { Car } from '../../cars/entities/car.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reviews')
@Check(`"rating_overall" BETWEEN 1 AND 5`)
@Index(['agencyId'])
@Index(['carId'])
@Index(['clientUserId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @Column({ name: 'car_id', type: 'uuid', nullable: true })
  carId: string | null;

  @Column({ name: 'booking_id', type: 'uuid', unique: true })
  bookingId: string;

  @Column({ name: 'client_user_id', type: 'uuid', nullable: true })
  clientUserId: string | null;

  @Column({ name: 'client_name', type: 'varchar', length: 200 })
  clientName: string;

  @Column({ name: 'rating_overall', type: 'smallint' })
  ratingOverall: number;

  @Column({ name: 'rating_car_condition', type: 'smallint', nullable: true })
  ratingCarCondition: number | null;

  @Column({ name: 'rating_service', type: 'smallint', nullable: true })
  ratingService: number | null;

  @Column({ name: 'rating_value', type: 'smallint', nullable: true })
  ratingValue: number | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'agency_reply', type: 'text', nullable: true })
  agencyReply: string | null;

  @Column({ name: 'agency_replied_at', type: 'timestamp', nullable: true })
  agencyRepliedAt: Date | null;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Agency, (agency) => agency.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @ManyToOne(() => Car, (car) => car.reviews, { nullable: true })
  @JoinColumn({ name: 'car_id' })
  car: Car | null;

  @OneToOne(() => Booking, (booking) => booking.review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => User, (user) => user.reviews, { nullable: true })
  @JoinColumn({ name: 'client_user_id' })
  clientUser: User | null;
}
