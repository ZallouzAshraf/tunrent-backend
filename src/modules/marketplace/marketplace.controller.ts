import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/roles.decorator';
import {
  MarketplaceAgencySearchDto,
  MarketplaceCarSearchDto,
} from './dto/marketplace-search.dto';
import { PublicAvailabilityQueryDto } from './dto/public-availability-query.dto';
import { PublicReviewsQueryDto } from './dto/public-reviews-query.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Public()
  @Get('cars')
  searchCars(@Query() filters: MarketplaceCarSearchDto) {
    return this.marketplaceService.searchCars(filters);
  }

  @Public()
  @Get('cars/:id/availability')
  getCarAvailability(
    @Param('id') id: string,
    @Query() query: PublicAvailabilityQueryDto,
  ) {
    return this.marketplaceService.getCarAvailability(
      id,
      query.from,
      query.to,
    );
  }

  @Public()
  @Get('cars/:id')
  getCarDetail(@Param('id') id: string) {
    return this.marketplaceService.getCarDetail(id);
  }

  @Public()
  @Get('agencies')
  searchAgencies(@Query() filters: MarketplaceAgencySearchDto) {
    return this.marketplaceService.searchAgencies(filters);
  }

  @Public()
  @Get('agencies/:slug')
  getAgencyBySlug(@Param('slug') slug: string) {
    return this.marketplaceService.getAgencyBySlug(slug);
  }

  @Public()
  @Get('reviews/featured')
  getFeaturedReviews() {
    return this.marketplaceService.getFeaturedReviews();
  }

  @Public()
  @Get('reviews')
  getPublicReviews(@Query() query: PublicReviewsQueryDto) {
    return this.marketplaceService.getPublicReviews(query);
  }
}
