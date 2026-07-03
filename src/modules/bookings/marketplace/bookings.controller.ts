import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { BookingsService } from '../bookings.service';
import { CreateMarketplaceBookingDto } from '../dto/create-marketplace-booking.dto';

@Controller('marketplace/bookings')
export class MarketplaceBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  create(
    @Body() dto: CreateMarketplaceBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingsService.createMarketplaceBooking(dto, req.user?.sub);
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
