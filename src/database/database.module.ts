import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from '../config/database.config';
import { User } from '../modules/users/entities/user.entity';
import { Agency } from '../modules/agencies/entities/agency.entity';
import { AgencyUser } from '../modules/agency-users/entities/agency-user.entity';
import { Car } from '../modules/cars/entities/car.entity';
import { Booking } from '../modules/bookings/entities/booking.entity';
import { Payment } from '../modules/payments/entities/payment.entity';
import { Review } from '../modules/reviews/entities/review.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { CarAvailabilityBlock } from '../modules/availability/entities/car-availability-block.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { PlanChangeRequest } from '../modules/billing/entities/plan-change-request.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';

const entities = [
  User,
  Agency,
  AgencyUser,
  Car,
  Booking,
  Payment,
  Review,
  Notification,
  CarAvailabilityBlock,
  AuditLog,
  RefreshToken,
  PlanChangeRequest,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        ssl: configService.get<boolean | { rejectUnauthorized: false }>(
          'database.ssl',
        ),
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
        extra: {
          connectionTimeoutMillis: 15_000,
        },
        entities,
        synchronize: configService.get<string>('app.nodeEnv') !== 'production',
        logging: configService.get<string>('app.nodeEnv') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}

export { entities };
