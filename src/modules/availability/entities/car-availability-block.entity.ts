import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agency } from '../../agencies/entities/agency.entity';
import { Car } from '../../cars/entities/car.entity';
import { User } from '../../users/entities/user.entity';

@Entity('car_availability_blocks')
@Index(['carId'])
@Index(['startDate'])
@Index(['endDate'])
@Index(['carId', 'startDate', 'endDate'])
export class CarAvailabilityBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @Column({ name: 'car_id', type: 'uuid' })
  carId: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @ManyToOne(() => Car, (car) => car.availabilityBlocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'car_id' })
  car: Car;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;
}
