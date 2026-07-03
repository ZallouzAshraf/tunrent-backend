import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Agency } from '../agencies/entities/agency.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { Car } from './entities/car.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Car, Agency]),
    AuthModule,
    UploadsModule,
  ],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
})
export class CarsModule {}
