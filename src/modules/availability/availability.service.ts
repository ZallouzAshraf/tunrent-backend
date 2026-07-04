import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BookingStatus, CarStatus, AgencyStatus } from '../../common/enums';
import { Booking } from '../bookings/entities/booking.entity';
import { Car } from '../cars/entities/car.entity';
import { CreateBlockDto } from './dto/create-block.dto';
import { CarAvailabilityBlock } from './entities/car-availability-block.entity';

export interface PublicUnavailableRange {
  start: string;
  end: string;
  type: 'booking' | 'block';
}

export interface PublicCarAvailabilityResult {
  carId: string;
  minRentalDays: number;
  unavailableRanges: PublicUnavailableRange[];
}

export interface CarAvailabilityResult {
  carId: string;
  blocks: CarAvailabilityBlock[];
  bookings: Booking[];
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(CarAvailabilityBlock)
    private readonly blockRepo: Repository<CarAvailabilityBlock>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async getCarAvailability(
    carId: string,
    agencyId: string,
  ): Promise<CarAvailabilityResult> {
    await this.ensureCarBelongsToAgency(carId, agencyId);

    const [blocks, bookings] = await Promise.all([
      this.blockRepo.find({
        where: { carId, agencyId },
        order: { startDate: 'ASC' },
      }),
      this.bookingRepo.find({
        where: {
          carId,
          agencyId,
          status: In([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
        },
        order: { startDate: 'ASC' },
      }),
    ]);

    return { carId, blocks, bookings };
  }

  async getPublicCarAvailability(
    carId: string,
    from?: string,
    to?: string,
  ): Promise<PublicCarAvailabilityResult> {
    const car = await this.carRepo.findOne({
      where: { id: carId, status: CarStatus.AVAILABLE },
      relations: { agency: true },
    });

    if (!car || car.agency.status !== AgencyStatus.ACTIVE) {
      throw new NotFoundException('Car not found');
    }

    const rangeStart = from
      ? this.parseDateOnly(from)
      : this.parseDateOnly(new Date().toISOString().slice(0, 10));
    const rangeEnd = to
      ? this.parseDateOnly(to)
      : this.addMonths(rangeStart, 3);

    const bookingStatuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS,
    ];

    const [blocks, bookings] = await Promise.all([
      this.blockRepo
        .createQueryBuilder('block')
        .where('block.carId = :carId', { carId })
        .andWhere('block.endDate >= :rangeStart', { rangeStart })
        .andWhere('block.startDate <= :rangeEnd', { rangeEnd })
        .orderBy('block.startDate', 'ASC')
        .getMany(),
      this.bookingRepo
        .createQueryBuilder('booking')
        .where('booking.carId = :carId', { carId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: bookingStatuses,
        })
        .andWhere('booking.endDate >= :rangeStart', { rangeStart })
        .andWhere('booking.startDate <= :rangeEnd', { rangeEnd })
        .orderBy('booking.startDate', 'ASC')
        .getMany(),
    ]);

    const unavailableRanges: PublicUnavailableRange[] = [
      ...bookings.map((b) => ({
        start: this.formatDateOnly(b.startDate),
        end: this.formatDateOnly(b.endDate),
        type: 'booking' as const,
      })),
      ...blocks.map((b) => ({
        start: this.formatDateOnly(b.startDate),
        end: this.formatDateOnly(b.endDate),
        type: 'block' as const,
      })),
    ].sort((a, b) => a.start.localeCompare(b.start));

    return {
      carId,
      minRentalDays: car.minRentalDays ?? 1,
      unavailableRanges,
    };
  }

  async createBlock(
    agencyId: string,
    dto: CreateBlockDto,
    userId: string,
  ): Promise<CarAvailabilityBlock> {
    await this.ensureCarBelongsToAgency(dto.carId, agencyId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const available = await this.isCarAvailable(
      dto.carId,
      startDate,
      endDate,
    );

    if (!available) {
      throw new BadRequestException(
        'Car is not available for the selected dates',
      );
    }

    const block = this.blockRepo.create({
      agencyId,
      carId: dto.carId,
      startDate,
      endDate,
      reason: dto.reason ?? null,
      notes: dto.notes ?? null,
      createdBy: userId,
    });

    return this.blockRepo.save(block);
  }

  async deleteBlock(blockId: string, agencyId: string): Promise<void> {
    const block = await this.blockRepo.findOne({
      where: { id: blockId, agencyId },
    });

    if (!block) {
      throw new NotFoundException('Availability block not found');
    }

    await this.blockRepo.remove(block);
  }

  async isCarAvailable(
    carId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    if (endDate <= startDate) {
      return false;
    }

    const [bookingConflict, blockConflict] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('booking')
        .where('booking.carId = :carId', { carId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
          ],
        })
        .andWhere('booking.startDate <= :endDate', { endDate })
        .andWhere('booking.endDate >= :startDate', { startDate })
        .getCount(),
      this.blockRepo
        .createQueryBuilder('block')
        .where('block.carId = :carId', { carId })
        .andWhere('block.startDate <= :endDate', { endDate })
        .andWhere('block.endDate >= :startDate', { startDate })
        .getCount(),
    ]);

    return bookingConflict === 0 && blockConflict === 0;
  }

  private async ensureCarBelongsToAgency(
    carId: string,
    agencyId: string,
  ): Promise<Car> {
    const car = await this.carRepo.findOne({
      where: { id: carId, agencyId },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    return car;
  }

  private parseDateOnly(value: string): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private formatDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
}
