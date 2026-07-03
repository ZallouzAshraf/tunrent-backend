import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AgencyStatus,
  BookingStatus,
  CarStatus,
} from '../../common/enums';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import { Agency } from '../agencies/entities/agency.entity';
import { Car } from '../cars/entities/car.entity';
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

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
  ) {}

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

    if (filters.seats !== undefined) {
      qb.andWhere('car.seats >= :seats', { seats: filters.seats });
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
      qb.andWhere(
        `car.id NOT IN (
          SELECT booking.car_id FROM bookings booking
          WHERE booking.status IN (:...bookingStatuses)
          AND booking.start_date <= :endDate
          AND booking.end_date >= :startDate
        )`,
        {
          bookingStatuses: [
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
          ],
          startDate: filters.start_date,
          endDate: filters.end_date,
        },
      );

      qb.andWhere(
        `car.id NOT IN (
          SELECT block.car_id FROM car_availability_blocks block
          WHERE block.start_date <= :endDate
          AND block.end_date >= :startDate
        )`,
        {
          startDate: filters.start_date,
          endDate: filters.end_date,
        },
      );
    }

    switch (filters.sort) {
      case MarketplaceSort.PRICE_ASC:
        qb.orderBy('car.pricePerDay', 'ASC');
        break;
      case MarketplaceSort.PRICE_DESC:
        qb.orderBy('car.pricePerDay', 'DESC');
        break;
      case MarketplaceSort.RATING_DESC:
        qb.orderBy('agency.avgRating', 'DESC');
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
      qb.andWhere(
        '(agency.name ILIKE :search OR agency.city ILIKE :search OR agency.description ILIKE :search)',
        { search: `%${filters.search.trim()}%` },
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
