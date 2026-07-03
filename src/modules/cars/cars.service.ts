import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CarStatus } from '../../common/enums';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import { Agency } from '../agencies/entities/agency.entity';
import { UploadsService } from '../uploads/uploads.service';
import { CarQueryDto } from './dto/car-query.dto';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { UpdateCarStatusDto } from './dto/update-car-status.dto';
import { Car } from './entities/car.entity';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    private readonly uploadsService: UploadsService,
  ) {}

  async findAll(
    agencyId: string,
    query: CarQueryDto,
  ): Promise<PaginatedResult<Car>> {
    const { page, limit, skip } = normalizePagination(query);

    const qb = this.carRepo
      .createQueryBuilder('car')
      .where('car.agencyId = :agencyId', { agencyId });

    if (query.status) {
      qb.andWhere('car.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('car.category = :category', { category: query.category });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('car.brand ILIKE :search', { search })
            .orWhere('car.model ILIKE :search', { search })
            .orWhere('car.registrationNumber ILIKE :search', { search });
        }),
      );
    }

    qb.orderBy('car.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(carId: string, agencyId: string): Promise<Car> {
    const car = await this.carRepo.findOne({
      where: { id: carId, agencyId },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    return car;
  }

  async create(
    agencyId: string,
    dto: CreateCarDto,
    userId: string,
  ): Promise<Car> {
    const agency = await this.agencyRepo.findOne({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    const currentCount = await this.carRepo.count({
      where: { agencyId },
    });

    if (currentCount >= agency.maxCars) {
      throw new BadRequestException(
        `Car limit reached (${agency.maxCars} max for current plan)`,
      );
    }

    const existing = await this.carRepo.findOne({
      where: { agencyId, registrationNumber: dto.registrationNumber },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException(
        'A car with this registration number already exists',
      );
    }

    const car = this.carRepo.create({
      ...dto,
      agencyId,
      createdBy: userId,
      photos: dto.photos ?? [],
      pickupLocations: dto.pickupLocations ?? [],
      thumbnailUrl: dto.photos?.[0] ?? null,
    });

    return this.carRepo.save(car);
  }

  async update(
    carId: string,
    agencyId: string,
    dto: UpdateCarDto,
  ): Promise<Car> {
    const car = await this.findById(carId, agencyId);
    Object.assign(car, dto);

    if (dto.photos) {
      car.thumbnailUrl = dto.photos[0] ?? null;
    }

    return this.carRepo.save(car);
  }

  async softDelete(carId: string, agencyId: string): Promise<void> {
    const car = await this.findById(carId, agencyId);
    await this.carRepo.softRemove(car);
  }

  async updateStatus(
    carId: string,
    agencyId: string,
    dto: UpdateCarStatusDto,
  ): Promise<Car> {
    const car = await this.findById(carId, agencyId);
    car.status = dto.status;
    return this.carRepo.save(car);
  }

  async addPhoto(
    carId: string,
    agencyId: string,
    file: Express.Multer.File,
  ): Promise<Car> {
    const car = await this.findById(carId, agencyId);
    const upload = await this.uploadsService.uploadImage(file, {
      folder: 'tunrent/car-photos',
      maxWidth: 1600,
      maxHeight: 1200,
    });

    car.photos = [...car.photos, upload.url];

    if (!car.thumbnailUrl) {
      car.thumbnailUrl = upload.url;
    }

    return this.carRepo.save(car);
  }

  async removePhoto(
    carId: string,
    agencyId: string,
    photoIndex: number,
  ): Promise<Car> {
    const car = await this.findById(carId, agencyId);

    if (photoIndex < 0 || photoIndex >= car.photos.length) {
      throw new BadRequestException('Invalid photo index');
    }

    const removedUrl = car.photos[photoIndex];
    car.photos = car.photos.filter((_, index) => index !== photoIndex);

    if (car.thumbnailUrl === removedUrl) {
      car.thumbnailUrl = car.photos[0] ?? null;
    }

    return this.carRepo.save(car);
  }
}
