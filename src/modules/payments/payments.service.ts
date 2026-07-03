import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationType,
  PaymentStatus,
} from '../../common/enums';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import { Booking } from '../bookings/entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(
    agencyId: string,
    query: PaymentQueryDto,
  ): Promise<PaginatedResult<Payment>> {
    const { page, limit, skip } = normalizePagination(query);

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .where('payment.agencyId = :agencyId', { agencyId });

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    if (query.bookingId) {
      qb.andWhere('payment.bookingId = :bookingId', {
        bookingId: query.bookingId,
      });
    }

    qb.orderBy('payment.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string, agencyId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id, agencyId },
      relations: { booking: { car: true } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async create(
    agencyId: string,
    dto: CreatePaymentDto,
    userId: string,
  ): Promise<Payment> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId, agencyId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const status = dto.status ?? PaymentStatus.COMPLETED;
    const paidAt =
      dto.paidAt != null
        ? new Date(dto.paidAt)
        : status === PaymentStatus.COMPLETED
          ? new Date()
          : null;

    const payment = this.paymentRepo.create({
      agencyId,
      bookingId: dto.bookingId,
      amount: dto.amount,
      method: dto.method,
      type: dto.type,
      status,
      transactionId: dto.transactionId ?? null,
      notes: dto.notes ?? null,
      paidAt,
      createdBy: userId,
    });

    const saved = await this.paymentRepo.save(payment);

    await this.notificationsService.notifyAgencyMembers(agencyId, {
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Paiement enregistré',
      message: `Paiement de ${Number(dto.amount).toFixed(2)} TND enregistré pour ${booking.bookingReference}.`,
      data: { paymentId: saved.id, bookingId: booking.id },
    });

    if (booking.clientUserId) {
      await this.notificationsService.create({
        userId: booking.clientUserId,
        agencyId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Paiement enregistré',
        message: `Un paiement de ${Number(dto.amount).toFixed(2)} TND a été enregistré pour votre réservation ${booking.bookingReference}.`,
        data: { paymentId: saved.id, bookingId: booking.id },
      });
    }

    return saved;
  }
}
