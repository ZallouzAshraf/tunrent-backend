import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import {
  CarCategory,
  Transmission,
  FuelType,
  CarStatus,
} from '../../../common/enums';
import { Agency } from '../../agencies/entities/agency.entity';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';
import { CarAvailabilityBlock } from '../../availability/entities/car-availability-block.entity';

export interface PickupLocation {
  city: string;
  address: string;
  lat: number;
  lng: number;
}

@Entity('cars')
@Unique(['agencyId', 'registrationNumber'])
@Index(['agencyId'])
@Index(['status'])
@Index(['category'])
@Index(['fuelType'])
@Index(['pricePerDay'])
@Index(['status', 'category', 'pricePerDay'])
@Index(['status', 'fuelType', 'transmission'])
@Index(['status', 'seats'])
export class Car {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string | null;

  @Column({ name: 'registration_number', type: 'varchar', length: 20 })
  registrationNumber: string;

  @Column({ type: 'varchar', length: 17, nullable: true, unique: true })
  vin: string | null;

  @Column({ type: 'enum', enum: CarCategory })
  category: CarCategory;

  @Column({ type: 'enum', enum: Transmission })
  transmission: Transmission;

  @Column({ name: 'fuel_type', type: 'enum', enum: FuelType })
  fuelType: FuelType;

  @Column({ type: 'smallint' })
  seats: number;

  @Column({ type: 'smallint', default: 4 })
  doors: number;

  @Column({ name: 'has_ac', type: 'boolean', default: true })
  hasAc: boolean;

  @Column({ name: 'has_gps', type: 'boolean', default: false })
  hasGps: boolean;

  @Column({ name: 'has_bluetooth', type: 'boolean', default: false })
  hasBluetooth: boolean;

  @Column({ name: 'has_usb', type: 'boolean', default: false })
  hasUsb: boolean;

  @Column({ name: 'has_child_seat', type: 'boolean', default: false })
  hasChildSeat: boolean;

  @Column({ name: 'has_insurance', type: 'boolean', default: true })
  hasInsurance: boolean;

  @Column({ type: 'int', nullable: true })
  mileage: number | null;

  @Column({ name: 'price_per_day', type: 'decimal', precision: 10, scale: 2 })
  pricePerDay: number;

  @Column({ name: 'price_per_week', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerWeek: number | null;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  depositAmount: number | null;

  @Column({ name: 'min_rental_days', type: 'smallint', default: 1 })
  minRentalDays: number;

  @Column({ name: 'min_driver_age', type: 'smallint', default: 21 })
  minDriverAge: number;

  @Column({ type: 'enum', enum: CarStatus, default: CarStatus.AVAILABLE })
  status: CarStatus;

  @Column({ type: 'jsonb', default: [] })
  photos: string[];

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'pickup_locations', type: 'jsonb', default: [] })
  pickupLocations: PickupLocation[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @ManyToOne(() => Agency, (agency) => agency.cars, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @OneToMany(() => Booking, (booking) => booking.car)
  bookings: Booking[];

  @OneToMany(() => Review, (review) => review.car)
  reviews: Review[];

  @OneToMany(() => CarAvailabilityBlock, (block) => block.car)
  availabilityBlocks: CarAvailabilityBlock[];
}
