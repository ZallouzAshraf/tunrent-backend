import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BookingStatus } from '../../common/enums';
import { Booking } from '../bookings/entities/booking.entity';
import { Car } from '../cars/entities/car.entity';
import { CreateBlockDto } from './dto/create-block.dto';
import { CarAvailabilityBlock } from './entities/car-availability-block.entity';

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
          statuses: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
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
}
