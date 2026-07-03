import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Agency } from '../agencies/entities/agency.entity';
import { AvailabilityModule } from '../availability/availability.module';
import { Car } from '../cars/entities/car.entity';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsService } from './bookings.service';
import { ClientBookingsController } from './client/bookings.controller';
import { DashboardBookingsController } from './dashboard/bookings.controller';
import { Booking } from './entities/booking.entity';
import { MarketplaceBookingsController } from './marketplace/bookings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Car, Agency]),
    AuthModule,
    AvailabilityModule,
    MailModule,
    NotificationsModule,
  ],
  controllers: [
    MarketplaceBookingsController,
    DashboardBookingsController,
    ClientBookingsController,
  ],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
