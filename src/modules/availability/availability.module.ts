import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Booking } from '../bookings/entities/booking.entity';
import { Car } from '../cars/entities/car.entity';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { CarAvailabilityBlock } from './entities/car-availability-block.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CarAvailabilityBlock, Car, Booking]),
    AuthModule,
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
