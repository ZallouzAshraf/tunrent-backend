import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Car } from '../cars/entities/car.entity';
import { Payment } from '../payments/entities/payment.entity';
import { BookingStatus, CarStatus, PaymentStatus } from '../../common/enums';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async getOverview(agencyId: string) {
    const [totalBookings, pendingBookings, activeBookings, totalCars, availableCars] =
      await Promise.all([
        this.bookingRepo.count({ where: { agencyId } }),
        this.bookingRepo.count({
          where: { agencyId, status: BookingStatus.PENDING },
        }),
        this.bookingRepo.count({
          where: {
            agencyId,
            status: In([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
          },
        }),
        this.carRepo.count({ where: { agencyId } }),
        this.carRepo.count({
          where: { agencyId, status: CarStatus.AVAILABLE },
        }),
      ]);

    const revenueResult = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.agency_id = :agencyId', { agencyId })
      .andWhere('p.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne<{ total: string }>();

    const occupancyRate =
      totalCars > 0
        ? Math.round(((totalCars - availableCars) / totalCars) * 100)
        : 0;

    return {
      totalBookings,
      pendingBookings,
      activeBookings,
      totalCars,
      availableCars,
      totalRevenue: parseFloat(revenueResult?.total || '0'),
      occupancyRate,
    };
  }

  async getBookingsChart(agencyId: string, months = 6) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const bookings = await this.bookingRepo
      .createQueryBuilder('b')
      .select("TO_CHAR(b.created_at, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('b.agency_id = :agencyId', { agencyId })
      .andWhere('b.created_at >= :startDate', { startDate })
      .groupBy("TO_CHAR(b.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; count: string }>();

    return bookings.map((row) => ({
      month: row.month,
      count: parseInt(row.count, 10),
    }));
  }

  async getTopCars(agencyId: string, limit = 5) {
    const results = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.car_id', 'carId')
      .addSelect('COUNT(*)', 'bookingCount')
      .where('b.agency_id = :agencyId', { agencyId })
      .andWhere('b.status IN (:...statuses)', {
        statuses: [BookingStatus.COMPLETED, BookingStatus.IN_PROGRESS],
      })
      .groupBy('b.car_id')
      .orderBy('"bookingCount"', 'DESC')
      .limit(limit)
      .getRawMany<{ carId: string; bookingCount: string }>();

    const carIds = results.map((r) => r.carId);
    if (!carIds.length) return [];

    const cars = await this.carRepo.findBy({ id: In(carIds) });
    const carMap = new Map(cars.map((c) => [c.id, c]));

    return results.map((r) => ({
      car: carMap.get(r.carId),
      bookingCount: parseInt(r.bookingCount, 10),
    }));
  }
}
