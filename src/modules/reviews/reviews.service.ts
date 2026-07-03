import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingStatus, NotificationType } from '../../common/enums';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import { Agency } from '../agencies/entities/agency.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(
    agencyId: string,
    query: ReviewQueryDto,
  ): Promise<PaginatedResult<Review>> {
    const { page, limit, skip } = normalizePagination(query);

    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.car', 'car')
      .leftJoinAndSelect('review.booking', 'booking')
      .where('review.agencyId = :agencyId', { agencyId });

    if (query.isVisible !== undefined) {
      qb.andWhere('review.isVisible = :isVisible', {
        isVisible: query.isVisible,
      });
    }

    qb.orderBy('review.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async reply(
    id: string,
    agencyId: string,
    agencyReply: string,
  ): Promise<Review> {
    const review = await this.findById(id, agencyId);

    review.agencyReply = agencyReply;
    review.agencyRepliedAt = new Date();

    return this.reviewRepo.save(review);
  }

  async toggleVisibility(
    id: string,
    agencyId: string,
    isVisible: boolean,
  ): Promise<Review> {
    const review = await this.findById(id, agencyId);
    review.isVisible = isVisible;
    return this.reviewRepo.save(review);
  }

  async create(dto: CreateReviewDto): Promise<Review> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: { review: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'Reviews can only be submitted for completed bookings',
      );
    }

    if (booking.review) {
      throw new ConflictException('A review already exists for this booking');
    }

    if (
      dto.clientUserId &&
      booking.clientUserId &&
      dto.clientUserId !== booking.clientUserId
    ) {
      throw new BadRequestException('Booking does not belong to this client');
    }

    const review = this.reviewRepo.create({
      agencyId: booking.agencyId,
      carId: booking.carId,
      bookingId: booking.id,
      clientUserId: dto.clientUserId ?? booking.clientUserId,
      clientName: `${booking.clientFirstName} ${booking.clientLastName}`,
      ratingOverall: dto.ratingOverall,
      ratingCarCondition: dto.ratingCarCondition ?? null,
      ratingService: dto.ratingService ?? null,
      ratingValue: dto.ratingValue ?? null,
      comment: dto.comment ?? null,
    });

    const saved = await this.reviewRepo.save(review);
    await this.updateAgencyRating(booking.agencyId);

    await this.notificationsService.notifyAgencyMembers(booking.agencyId, {
      type: NotificationType.REVIEW_NEW,
      title: 'Nouvel avis client',
      message: `${saved.clientName} a laissé un avis (${saved.ratingOverall}/5) sur la réservation ${booking.bookingReference}.`,
      data: { reviewId: saved.id, bookingId: booking.id },
    });

    return saved;
  }

  private async findById(id: string, agencyId: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({
      where: { id, agencyId },
      relations: { car: true, booking: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  private async updateAgencyRating(agencyId: string): Promise<void> {
    const result = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.ratingOverall)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.agencyId = :agencyId', { agencyId })
      .andWhere('review.isVisible = true')
      .getRawOne<{ avg: string; count: string }>();

    await this.agencyRepo.update(agencyId, {
      avgRating: Number(result?.avg ?? 0),
      totalReviews: Number(result?.count ?? 0),
    });
  }
}
