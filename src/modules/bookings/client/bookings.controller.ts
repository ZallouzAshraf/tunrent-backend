import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { BookingsService } from '../bookings.service';
import { CancelClientBookingDto } from '../dto/cancel-booking.dto';

@Controller('client/bookings')
@UseGuards(JwtAuthGuard)
export class ClientBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.bookingsService.findClientBookings(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookingsService.findClientBookingById(user.sub, id);
  }

  @Delete(':id')
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CancelClientBookingDto,
  ) {
    return this.bookingsService.cancelClientBooking(
      user.sub,
      id,
      dto.cancellationReason,
    );
  }
}
