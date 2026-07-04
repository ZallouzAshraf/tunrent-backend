import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, MoreThanOrEqual, Repository } from 'typeorm';
import {
  AgencyStatus,
  BookingSource,
  BookingStatus,
  CancelledBy,
  CarStatus,
  NotificationType,
} from '../../common/enums';
import { generateBookingReference } from '../../common/utils/booking-reference.util';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import { Agency } from '../agencies/entities/agency.entity';
import { AvailabilityService } from '../availability/availability.service';
import { Car } from '../cars/entities/car.entity';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateMarketplaceBookingDto } from './dto/create-marketplace-booking.dto';
import { CreateDashboardBookingDto } from './dto/create-dashboard-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { Booking } from './entities/booking.entity';

export interface BookingCalendarResult {
  cars: Car[];
  bookings: Booking[];
}

export interface PublicBookingStatus {
  bookingReference: string;
  status: BookingStatus;
  clientFirstName: string;
  clientLastName: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalPrice: number;
  pickupLocation: string;
  dropoffLocation: string;
  car: Pick<Car, 'brand' | 'model' | 'year' | 'thumbnailUrl'>;
  agency: Pick<Agency, 'name' | 'phone' | 'email'>;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: Date;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly availabilityService: AvailabilityService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async createMarketplaceBooking(
    dto: CreateMarketplaceBookingDto,
    clientUserId?: string,
  ): Promise<Booking> {
    const car = await this.carRepo.findOne({
      where: { id: dto.carId },
      relations: { agency: true },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    if (car.agency.status !== AgencyStatus.ACTIVE) {
      throw new BadRequestException('Agency is not available for bookings');
    }

    if (car.status !== CarStatus.AVAILABLE) {
      throw new BadRequestException('Car is not available for booking');
    }

    const startDate = this.parseDate(dto.startDate);
    const endDate = this.parseDate(dto.endDate);

    const available = await this.availabilityService.isCarAvailable(
      car.id,
      startDate,
      endDate,
    );

    if (!available) {
      throw new BadRequestException('Car is not available for the selected dates');
    }

    const totalDays = this.calculateTotalDays(startDate, endDate);
    const pricePerDay = Number(car.pricePerDay);
    const totalPrice = pricePerDay * totalDays;
    const bookingReference = await this.nextBookingReference();

    const booking = this.bookingRepo.create({
      bookingReference,
      agencyId: car.agencyId,
      carId: car.id,
      clientUserId: clientUserId ?? null,
      clientFirstName: dto.clientFirstName,
      clientLastName: dto.clientLastName,
      clientEmail: dto.clientEmail.toLowerCase(),
      clientPhone: dto.clientPhone,
      clientCin: dto.clientCin ?? null,
      clientDrivingLicense: dto.clientDrivingLicense ?? null,
      startDate,
      endDate,
      totalDays,
      pickupLocation: dto.pickupLocation,
      dropoffLocation: dto.dropoffLocation,
      pricePerDay,
      totalPrice,
      depositAmount: car.depositAmount ? Number(car.depositAmount) : null,
      status: BookingStatus.PENDING,
      source: BookingSource.MARKETPLACE,
      clientNotes: dto.clientNotes ?? null,
    });

    const saved = await this.bookingRepo.save(booking);
    const carName = `${car.brand} ${car.model} (${car.year})`;
    const clientName = `${dto.clientFirstName} ${dto.clientLastName}`;
    const frontendUrl = this.configService.get<string>('app.frontendUrl')!;

    await this.mailService.sendBookingRequestAgency(car.agency.email, {
      agencyName: car.agency.name,
      bookingReference,
      clientName,
      clientEmail: dto.clientEmail,
      clientPhone: dto.clientPhone,
      carName,
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      totalPrice: totalPrice.toFixed(2),
      dashboardUrl: `${frontendUrl}/dashboard/bookings/${saved.id}`,
    });

    await this.notificationsService.notifyAgencyMembers(car.agencyId, {
      type: NotificationType.BOOKING_NEW,
      title: 'Nouvelle demande de réservation',
      message: `${clientName} a demandé la location de ${carName} (${bookingReference}).`,
      data: { bookingId: saved.id, carId: car.id },
    });

    return saved;
  }

  async createDashboardBooking(
    dto: CreateDashboardBookingDto,
    agencyId: string,
    userId: string,
  ): Promise<Booking> {
    const car = await this.carRepo.findOne({
      where: { id: dto.carId, agencyId },
      relations: { agency: true },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    if (car.status !== CarStatus.AVAILABLE) {
      throw new BadRequestException('Car is not available for booking');
    }

    const source = dto.source ?? BookingSource.DIRECT;
    if (
      source !== BookingSource.DIRECT &&
      source !== BookingSource.PHONE
    ) {
      throw new BadRequestException('Invalid booking source for dashboard');
    }

    const startDate = this.parseDate(dto.startDate);
    const endDate = this.parseDate(dto.endDate);

    const available = await this.availabilityService.isCarAvailable(
      car.id,
      startDate,
      endDate,
    );

    if (!available) {
      throw new BadRequestException(
        'Car is not available for the selected dates',
      );
    }

    const totalDays = this.calculateTotalDays(startDate, endDate);
    const pricePerDay = Number(car.pricePerDay);
    const totalPrice = pricePerDay * totalDays;
    const bookingReference = await this.nextBookingReference();
    const autoConfirm = dto.autoConfirm === true;

    const booking = this.bookingRepo.create({
      bookingReference,
      agencyId: car.agencyId,
      carId: car.id,
      clientUserId: null,
      clientFirstName: dto.clientFirstName,
      clientLastName: dto.clientLastName,
      clientEmail: dto.clientEmail.toLowerCase(),
      clientPhone: dto.clientPhone,
      clientCin: dto.clientCin ?? null,
      clientDrivingLicense: dto.clientDrivingLicense ?? null,
      startDate,
      endDate,
      totalDays,
      pickupLocation: dto.pickupLocation,
      dropoffLocation: dto.dropoffLocation,
      pricePerDay,
      totalPrice,
      depositAmount: car.depositAmount ? Number(car.depositAmount) : null,
      status: autoConfirm ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
      source,
      clientNotes: dto.clientNotes ?? null,
      confirmedBy: autoConfirm ? userId : null,
      confirmedAt: autoConfirm ? new Date() : null,
    });

    const saved = await this.bookingRepo.save(booking);

    if (autoConfirm) {
      await this.sendBookingConfirmedEmail(saved);
      await this.notifyClient(saved, {
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Réservation confirmée',
        message: `Votre réservation ${saved.bookingReference} a été confirmée.`,
      });
    } else {
      await this.notificationsService.notifyAgencyMembers(car.agencyId, {
        type: NotificationType.BOOKING_NEW,
        title: 'Nouvelle réservation',
        message: `Réservation ${saved.bookingReference} créée depuis le dashboard.`,
        data: { bookingId: saved.id, carId: car.id },
      });
    }

    return saved;
  }

  async findByReference(
    reference: string,
    email: string,
  ): Promise<PublicBookingStatus> {
    const booking = await this.bookingRepo.findOne({
      where: {
        bookingReference: reference,
        clientEmail: email.toLowerCase(),
      },
      relations: { car: true, agency: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      bookingReference: booking.bookingReference,
      status: booking.status,
      clientFirstName: booking.clientFirstName,
      clientLastName: booking.clientLastName,
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalDays: booking.totalDays,
      totalPrice: Number(booking.totalPrice),
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      car: {
        brand: booking.car.brand,
        model: booking.car.model,
        year: booking.car.year,
        thumbnailUrl: booking.car.thumbnailUrl,
      },
      agency: {
        name: booking.agency.name,
        phone: booking.agency.phone,
        email: booking.agency.email,
      },
      rejectionReason: booking.rejectionReason,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt,
    };
  }

  async findAllDashboard(
    agencyId: string,
    query: BookingQueryDto,
  ): Promise<PaginatedResult<Booking>> {
    const { page, limit, skip } = normalizePagination(query);

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.car', 'car')
      .leftJoinAndSelect('booking.payments', 'payments')
      .where('booking.agencyId = :agencyId', { agencyId });

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    if (query.startDateFrom) {
      qb.andWhere('booking.startDate >= :startDateFrom', {
        startDateFrom: query.startDateFrom,
      });
    }

    if (query.startDateTo) {
      qb.andWhere('booking.startDate <= :startDateTo', {
        startDateTo: query.startDateTo,
      });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('booking.bookingReference ILIKE :search', { search })
            .orWhere('booking.clientFirstName ILIKE :search', { search })
            .orWhere('booking.clientLastName ILIKE :search', { search })
            .orWhere('booking.clientEmail ILIKE :search', { search })
            .orWhere('car.brand ILIKE :search', { search })
            .orWhere('car.model ILIKE :search', { search });
        }),
      );
    }

    qb.orderBy('booking.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findByIdDashboard(id: string, agencyId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id, agencyId },
      relations: { car: true, payments: true, review: true, clientUser: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async confirm(
    id: string,
    agencyId: string,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.findByIdDashboard(id, agencyId);

    if (booking.status === BookingStatus.CONFIRMED) {
      return booking;
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    const available = await this.availabilityService.isCarAvailable(
      booking.carId,
      booking.startDate,
      booking.endDate,
    );

    if (!available) {
      throw new BadRequestException(
        'Car is no longer available for the selected dates',
      );
    }

    booking.status = BookingStatus.CONFIRMED;
    booking.confirmedBy = userId;
    booking.confirmedAt = new Date();

    const saved = await this.bookingRepo.save(booking);
    await this.sendBookingConfirmedEmail(saved);
    await this.notifyClient(saved, {
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Réservation confirmée',
      message: `Votre réservation ${saved.bookingReference} a été confirmée.`,
    });

    return saved;
  }

  async reject(
    id: string,
    agencyId: string,
    dto: RejectBookingDto,
  ): Promise<Booking> {
    const booking = await this.findByIdDashboard(id, agencyId);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be rejected');
    }

    booking.status = BookingStatus.REJECTED;
    booking.rejectionReason = dto.rejectionReason;
    if (dto.agencyNotes) {
      booking.agencyNotes = dto.agencyNotes;
    }

    const saved = await this.bookingRepo.save(booking);
    const car = await this.getCarForBooking(saved);

    await this.mailService.sendBookingRejected(saved.clientEmail, {
      clientName: `${saved.clientFirstName} ${saved.clientLastName}`,
      bookingReference: saved.bookingReference,
      agencyName: car.agency.name,
      carName: this.formatCarName(car),
      rejectionReason: dto.rejectionReason,
    });

    await this.notifyClient(saved, {
      type: NotificationType.BOOKING_REJECTED,
      title: 'Réservation refusée',
      message: `Votre réservation ${saved.bookingReference} a été refusée.`,
    });

    return saved;
  }

  async start(id: string, agencyId: string): Promise<Booking> {
    const booking = await this.findByIdDashboard(id, agencyId);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be started');
    }

    booking.status = BookingStatus.IN_PROGRESS;
    booking.pickupAt = new Date();

    const car = await this.carRepo.findOne({
      where: { id: booking.carId, agencyId },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    car.status = CarStatus.RENTED;
    await this.carRepo.save(car);

    return this.bookingRepo.save(booking);
  }

  async complete(id: string, agencyId: string): Promise<Booking> {
    const booking = await this.findByIdDashboard(id, agencyId);

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException('Only in-progress bookings can be completed');
    }

    booking.status = BookingStatus.COMPLETED;
    booking.dropoffAt = new Date();

    const car = await this.carRepo.findOne({
      where: { id: booking.carId, agencyId },
      relations: { agency: true },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    car.status = CarStatus.AVAILABLE;
    await this.carRepo.save(car);

    await this.agencyRepo.increment({ id: agencyId }, 'totalBookings', 1);

    const saved = await this.bookingRepo.save(booking);
    const frontendUrl = this.configService.get<string>('app.frontendUrl')!;

    await this.mailService.sendBookingCompleted(saved.clientEmail, {
      clientName: `${saved.clientFirstName} ${saved.clientLastName}`,
      bookingReference: saved.bookingReference,
      agencyName: car.agency.name,
      carName: this.formatCarName(car),
      reviewUrl: `${frontendUrl}/bookings/${saved.bookingReference}/review`,
    });

    await this.notifyClient(saved, {
      type: NotificationType.BOOKING_COMPLETED,
      title: 'Location terminée',
      message: `Votre location ${saved.bookingReference} est terminée. Laissez un avis !`,
    });

    return saved;
  }

  async cancel(
    id: string,
    agencyId: string,
    dto: CancelBookingDto,
  ): Promise<Booking> {
    const booking = await this.findByIdDashboard(id, agencyId);

    if (
      ![BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS].includes(
        booking.status,
      )
    ) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    if (booking.status === BookingStatus.IN_PROGRESS) {
      const car = await this.carRepo.findOne({
        where: { id: booking.carId, agencyId },
      });

      if (car) {
        car.status = CarStatus.AVAILABLE;
        await this.carRepo.save(car);
      }
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledBy = CancelledBy.AGENCY;
    booking.cancellationReason = dto.cancellationReason ?? null;
    if (dto.agencyNotes) {
      booking.agencyNotes = dto.agencyNotes;
    }

    const saved = await this.bookingRepo.save(booking);
    await this.sendCancellationEmails(saved, CancelledBy.AGENCY);
    await this.notifyClient(saved, {
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Réservation annulée',
      message: `Votre réservation ${saved.bookingReference} a été annulée par l'agence.`,
    });

    return saved;
  }

  async findClientBookings(userId: string): Promise<Booking[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.claimGuestBookingsForUser(userId, user.email);

    return this.bookingRepo.find({
      where: { clientUserId: userId },
      relations: { car: true, agency: true, review: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findClientBookingById(
    userId: string,
    id: string,
  ): Promise<Booking> {
    await this.findClientBookings(userId);
    const booking = await this.bookingRepo.findOne({
      where: { id, clientUserId: userId },
      relations: { car: true, agency: true, review: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /** Link guest bookings (same email) to the authenticated account. */
  private async claimGuestBookingsForUser(
    userId: string,
    email: string,
  ): Promise<void> {
    await this.bookingRepo
      .createQueryBuilder()
      .update(Booking)
      .set({ clientUserId: userId })
      .where('client_user_id IS NULL')
      .andWhere('LOWER(client_email) = LOWER(:email)', { email })
      .execute();
  }

  async cancelClientBooking(
    userId: string,
    id: string,
    cancellationReason?: string,
  ): Promise<Booking> {
    const booking = await this.findClientBookingById(userId, id);

    if (
      ![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status)
    ) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    const today = this.parseDate(new Date().toISOString().slice(0, 10));
    const startDate = this.parseDate(
      booking.startDate instanceof Date
        ? booking.startDate.toISOString().slice(0, 10)
        : String(booking.startDate),
    );
    const minCancelDate = new Date(today);
    minCancelDate.setDate(minCancelDate.getDate() + 2);

    if (startDate < minCancelDate) {
      throw new BadRequestException(
        'Cancellation must be at least 2 days before the start date',
      );
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledBy = CancelledBy.CLIENT;
    booking.cancellationReason = cancellationReason ?? null;

    const saved = await this.bookingRepo.save(booking);
    await this.sendCancellationEmails(saved, CancelledBy.CLIENT);
    await this.notificationsService.notifyAgencyMembers(booking.agencyId, {
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Réservation annulée',
      message: `Le client a annulé la réservation ${saved.bookingReference}.`,
      data: { bookingId: saved.id },
    });

    return saved;
  }

  async getCalendar(agencyId: string): Promise<BookingCalendarResult> {
    const [cars, bookings] = await Promise.all([
      this.carRepo.find({
        where: { agencyId },
        order: { brand: 'ASC', model: 'ASC' },
      }),
      this.bookingRepo.find({
        where: {
          agencyId,
          status: BookingStatus.CONFIRMED,
        },
        relations: { car: true },
        order: { startDate: 'ASC' },
      }).then(async (confirmed) => {
        const inProgress = await this.bookingRepo.find({
          where: { agencyId, status: BookingStatus.IN_PROGRESS },
          relations: { car: true },
          order: { startDate: 'ASC' },
        });
        const pending = await this.bookingRepo.find({
          where: { agencyId, status: BookingStatus.PENDING },
          relations: { car: true },
          order: { startDate: 'ASC' },
        });
        return [...pending, ...confirmed, ...inProgress].sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        );
      }),
    ]);

    return { cars, bookings };
  }

  private async nextBookingReference(): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const count = await this.bookingRepo.count({
      where: { createdAt: MoreThanOrEqual(startOfYear) },
    });

    return generateBookingReference(count + 1);
  }

  private calculateTotalDays(startDate: Date, endDate: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatCarName(car: Car): string {
    return `${car.brand} ${car.model} (${car.year})`;
  }

  private async getCarForBooking(booking: Booking): Promise<Car> {
    const car = await this.carRepo.findOne({
      where: { id: booking.carId },
      relations: { agency: true },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    return car;
  }

  private async sendBookingConfirmedEmail(booking: Booking): Promise<void> {
    const car = await this.getCarForBooking(booking);

    await this.mailService.sendBookingConfirmed(booking.clientEmail, {
      clientName: `${booking.clientFirstName} ${booking.clientLastName}`,
      bookingReference: booking.bookingReference,
      agencyName: car.agency.name,
      carName: this.formatCarName(car),
      startDate: this.formatDate(booking.startDate),
      endDate: this.formatDate(booking.endDate),
      pickupLocation: booking.pickupLocation,
      totalPrice: Number(booking.totalPrice).toFixed(2),
    });
  }

  private async sendCancellationEmails(
    booking: Booking,
    cancelledBy: CancelledBy,
  ): Promise<void> {
    const car = await this.getCarForBooking(booking);
    const carName = this.formatCarName(car);
    const cancelledByLabel =
      cancelledBy === CancelledBy.CLIENT ? 'client' : 'agence';

    await this.mailService.sendBookingCancelled(booking.clientEmail, {
      recipientName: `${booking.clientFirstName} ${booking.clientLastName}`,
      bookingReference: booking.bookingReference,
      agencyName: car.agency.name,
      carName,
      cancelledBy: cancelledByLabel,
      cancellationReason: booking.cancellationReason ?? undefined,
    });

    await this.mailService.sendBookingCancelled(car.agency.email, {
      recipientName: car.agency.name,
      bookingReference: booking.bookingReference,
      agencyName: car.agency.name,
      carName,
      cancelledBy: cancelledByLabel,
      cancellationReason: booking.cancellationReason ?? undefined,
    });
  }

  private async notifyClient(
    booking: Booking,
    params: {
      type: NotificationType;
      title: string;
      message: string;
    },
  ): Promise<void> {
    if (!booking.clientUserId) {
      return;
    }

    await this.notificationsService.create({
      userId: booking.clientUserId,
      agencyId: booking.agencyId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: { bookingId: booking.id },
    });
  }
}
