import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agency } from '../agencies/entities/agency.entity';
import { Car } from '../cars/entities/car.entity';
import { AvailabilityModule } from '../availability/availability.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Car, Agency]),
    ReviewsModule,
    AvailabilityModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
