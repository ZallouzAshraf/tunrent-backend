import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Agency } from '../agencies/entities/agency.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DashboardReviewsController } from './dashboard/reviews.controller';
import { Review } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Booking, Agency]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [DashboardReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
