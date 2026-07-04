import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import cloudinaryConfig from './config/cloudinary.config';
import mailConfig from './config/mail.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AvailabilityModule } from './modules/availability/availability.module';
import { AgenciesModule } from './modules/agencies/agencies.module';
import { AgencyUsersModule } from './modules/agency-users/agency-users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CarsModule } from './modules/cars/cars.module';
import { MailModule } from './modules/mail/mail.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { StatsModule } from './modules/stats/stats.module';
import { BillingModule } from './modules/billing/billing.module';
import { ClientModule } from './modules/client/client.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, mailConfig, cloudinaryConfig],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ([{
        ttl: (configService.get<number>('app.throttleTtl') || 60) * 1000,
        limit: configService.get<number>('app.throttleLimit') || 100,
      }]),
    }),
    DatabaseModule,
    CommonModule,
    AuthModule,
    AgenciesModule,
    AgencyUsersModule,
    MailModule,
    UploadsModule,
    CarsModule,
    AvailabilityModule,
    MarketplaceModule,
    NotificationsModule,
    AdminModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    StatsModule,
    BillingModule,
    ClientModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
