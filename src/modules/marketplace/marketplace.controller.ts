import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/roles.decorator';
import {
  MarketplaceAgencySearchDto,
  MarketplaceCarSearchDto,
} from './dto/marketplace-search.dto';
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
}
