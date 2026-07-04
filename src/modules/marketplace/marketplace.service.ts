import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  AgencyStatus,
  BookingStatus,
  CarStatus,
} from '../../common/enums';
import { escapeIlike } from '../../common/utils/escape-ilike.util';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import { Agency } from '../agencies/entities/agency.entity';
import { Car } from '../cars/entities/car.entity';
import { ReviewsService } from '../reviews/reviews.service';
import {
  MarketplaceAgencySearchDto,
  MarketplaceCarSearchDto,
  MarketplaceSort,
} from './dto/marketplace-search.dto';

type PublicAgency = Omit<
  Agency,
  | 'patenteNumber'
  | 'patenteUrl'
  | 'rib'
  | 'rejectionReason'
  | 'email'
  | 'members'
  | 'bookings'
  | 'payments'
  | 'reviews'
  | 'notifications'
>;

export type MarketplaceCar = Omit<Car, 'agency'> & { agency: PublicAgency };

const UNAVAILABLE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
] as const;

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    private readonly reviewsService: ReviewsService,
  ) {}

  getFeaturedReviews(limit = 8) {
    return this.reviewsService.findFeaturedPublic(limit);
  }

  async searchCars(
    filters: MarketplaceCarSearchDto,
  ): Promise<PaginatedResult<MarketplaceCar>> {
    const { page, limit, skip } = normalizePagination(filters);

    const qb = this.carRepo
      .createQueryBuilder('car')
      .innerJoinAndSelect('car.agency', 'agency')
      .where('car.status = :carStatus', { carStatus: CarStatus.AVAILABLE })
      .andWhere('agency.status = :agencyStatus', {
        agencyStatus: AgencyStatus.ACTIVE,
      });

    if (filters.governorate) {
      qb.andWhere('agency.governorate = :governorate', {
        governorate: filters.governorate,
      });
    }

    if (filters.category) {
      qb.andWhere('car.category = :category', { category: filters.category });
    }

    if (filters.transmission) {
      qb.andWhere('car.transmission = :transmission', {
        transmission: filters.transmission,
      });
    }

    if (filters.has_ac !== undefined) {
      qb.andWhere('car.hasAc = :hasAc', { hasAc: filters.has_ac });
    }

    if (filters.has_gps !== undefined) {
      qb.andWhere('car.hasGps = :hasGps', { hasGps: filters.has_gps });
    }

    if (filters.has_bluetooth !== undefined) {
      qb.andWhere('car.hasBluetooth = :hasBluetooth', {
        hasBluetooth: filters.has_bluetooth,
      });
    }

    if (filters.has_child_seat !== undefined) {
      qb.andWhere('car.hasChildSeat = :hasChildSeat', {
        hasChildSeat: filters.has_child_seat,
      });
    }

    if (filters.fuel_type) {
      qb.andWhere('car.fuelType = :fuelType', { fuelType: filters.fuel_type });
    }

    if (filters.seats !== undefined) {
      qb.andWhere('car.seats >= :seats', { seats: filters.seats });
    }

    if (filters.search?.trim()) {
      const term = `%${escapeIlike(filters.search.trim())}%`;
      qb.andWhere(
        `(car.brand ILIKE :search ESCAPE '\\' OR car.model ILIKE :search ESCAPE '\\' OR car.description ILIKE :search ESCAPE '\\')`,
        { search: term },
      );
    }

    if (filters.min_price !== undefined) {
      qb.andWhere('car.pricePerDay >= :minPrice', {
        minPrice: filters.min_price,
      });
    }

    if (filters.max_price !== undefined) {
      qb.andWhere('car.pricePerDay <= :maxPrice', {
        maxPrice: filters.max_price,
      });
    }

    if (filters.start_date && filters.end_date) {
      this.applyAvailabilityFilter(
        qb,
        filters.start_date,
        filters.end_date,
      );
    }

    switch (filters.sort) {
      case MarketplaceSort.PRICE_ASC:
        qb.orderBy('car.pricePerDay', 'ASC').addOrderBy('car.createdAt', 'DESC');
        break;
      case MarketplaceSort.PRICE_DESC:
        qb.orderBy('car.pricePerDay', 'DESC').addOrderBy('car.createdAt', 'DESC');
        break;
      case MarketplaceSort.RATING_DESC:
        qb.orderBy('agency.avgRating', 'DESC', 'NULLS LAST').addOrderBy(
          'car.createdAt',
          'DESC',
        );
        break;
      default:
        qb.orderBy('car.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const sanitized: MarketplaceCar[] = data.map((car) => ({
      ...car,
      agency: this.toPublicAgency(car.agency),
    }));

    return buildPaginatedResult(sanitized, total, page, limit);
  }

  async getCarDetail(id: string): Promise<MarketplaceCar> {
    const car = await this.carRepo.findOne({
      where: { id },
      relations: { agency: true },
    });

    if (!car || car.agency.status !== AgencyStatus.ACTIVE) {
      throw new NotFoundException('Car not found');
    }

    return {
      ...car,
      agency: this.toPublicAgency(car.agency),
    } as MarketplaceCar;
  }

  async searchAgencies(
    filters: MarketplaceAgencySearchDto,
  ): Promise<PaginatedResult<PublicAgency>> {
    const { page, limit, skip } = normalizePagination(filters);

    const qb = this.agencyRepo
      .createQueryBuilder('agency')
      .where('agency.status = :status', { status: AgencyStatus.ACTIVE });

    if (filters.governorate) {
      qb.andWhere('agency.governorate = :governorate', {
        governorate: filters.governorate,
      });
    }

    if (filters.is_featured !== undefined) {
      qb.andWhere('agency.isFeatured = :isFeatured', {
        isFeatured: filters.is_featured,
      });
    }

    if (filters.search?.trim()) {
      const term = `%${escapeIlike(filters.search.trim())}%`;
      qb.andWhere(
        `(agency.name ILIKE :search ESCAPE '\\' OR agency.city ILIKE :search ESCAPE '\\' OR agency.description ILIKE :search ESCAPE '\\')`,
        { search: term },
      );
    }

    switch (filters.sort) {
      case MarketplaceSort.RATING_DESC:
        qb.orderBy('agency.avgRating', 'DESC');
        break;
      default:
        qb.orderBy('agency.isFeatured', 'DESC').addOrderBy(
          'agency.avgRating',
          'DESC',
        );
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(
      data.map((agency) => this.toPublicAgency(agency)),
      total,
      page,
      limit,
    );
  }

  async getAgencyBySlug(slug: string): Promise<{
    agency: PublicAgency;
    cars: Car[];
  }> {
    const agency = await this.agencyRepo.findOne({
      where: { slug, status: AgencyStatus.ACTIVE },
    });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    const cars = await this.carRepo.find({
      where: { agencyId: agency.id, status: CarStatus.AVAILABLE },
      order: { pricePerDay: 'ASC' },
    });

    return {
      agency: this.toPublicAgency(agency),
      cars,
    };
  }

  private applyAvailabilityFilter(
    qb: SelectQueryBuilder<Car>,
    startDate: string,
    endDate: string,
  ): void {
    qb.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM bookings booking
        WHERE booking.car_id = car.id
        AND booking.status IN (:...bookingStatuses)
        AND booking.start_date <= :endDate
        AND booking.end_date >= :startDate
      )`,
      {
        bookingStatuses: [...UNAVAILABLE_BOOKING_STATUSES],
        startDate,
        endDate,
      },
    );

    qb.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM car_availability_blocks block
        WHERE block.car_id = car.id
        AND block.start_date <= :endDate
        AND block.end_date >= :startDate
      )`,
      { startDate, endDate },
    );
  }

  private toPublicAgency(agency: Agency): PublicAgency {
    const {
      patenteNumber: _patenteNumber,
      patenteUrl: _patenteUrl,
      rib: _rib,
      rejectionReason: _rejectionReason,
      email: _email,
      members: _members,
      bookings: _bookings,
      payments: _payments,
      reviews: _reviews,
      notifications: _notifications,
      ...publicAgency
    } = agency;

    return publicAgency;
  }
}
