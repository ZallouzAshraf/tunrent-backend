import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { Agency } from '../agencies/entities/agency.entity';
import { AvailabilityModule } from '../availability/availability.module';
import { Car } from '../cars/entities/car.entity';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { User } from '../users/entities/user.entity';
import { BookingsService } from './bookings.service';
import { ClientBookingsController } from './client/bookings.controller';
import { DashboardBookingsController } from './dashboard/bookings.controller';
import { Booking } from './entities/booking.entity';
import { MarketplaceBookingsController } from './marketplace/bookings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Car, Agency, User]),
    AuthModule,
    AvailabilityModule,
    MailModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [
    MarketplaceBookingsController,
    DashboardBookingsController,
    ClientBookingsController,
  ],
  providers: [BookingsService, OptionalJwtAuthGuard],
  exports: [BookingsService],
})
export class BookingsModule {}
