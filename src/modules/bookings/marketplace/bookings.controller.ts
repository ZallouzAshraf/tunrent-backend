import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../../../common/decorators/roles.decorator';
import { BookingsService } from '../bookings.service';
import { CreateMarketplaceBookingDto } from '../dto/create-marketplace-booking.dto';

@Controller('marketplace/bookings')
export class MarketplaceBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateMarketplaceBookingDto) {
    return this.bookingsService.createMarketplaceBooking(dto);
  }

  @Public()
  @Get(':reference')
  findByReference(
    @Param('reference') reference: string,
    @Query('email') email: string,
  ) {
    return this.bookingsService.findByReference(reference, email);
  }
}
