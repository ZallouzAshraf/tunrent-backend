import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAgency } from '../../../common/decorators/current-agency.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AgencyMemberGuard } from '../../../common/guards/agency-member.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PaymentsService } from '../../payments/payments.service';
import { BookingsService } from '../bookings.service';
import { BookingQueryDto } from '../dto/booking-query.dto';
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { CreateDashboardBookingDto } from '../dto/create-dashboard-booking.dto';
import { RejectBookingDto } from '../dto/reject-booking.dto';

@Controller('dashboard/bookings')
@UseGuards(JwtAuthGuard, AgencyMemberGuard)
export class DashboardBookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  findAll(
    @CurrentAgency() agencyId: string,
    @Query() query: BookingQueryDto,
  ) {
    return this.bookingsService.findAllDashboard(agencyId, query);
  }

  @Get('calendar')
  getCalendar(@CurrentAgency() agencyId: string) {
    return this.bookingsService.getCalendar(agencyId);
  }

  @Post()
  create(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDashboardBookingDto,
  ) {
    return this.bookingsService.createDashboardBooking(
      dto,
      agencyId,
      user.sub,
    );
  }

  @Get(':id')
  findById(@CurrentAgency() agencyId: string, @Param('id') id: string) {
    return this.bookingsService.findByIdDashboard(id, agencyId);
  }

  @Patch(':id/confirm')
  confirm(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.bookingsService.confirm(id, agencyId, user.sub);
  }

  @Patch(':id/reject')
  reject(
    @CurrentAgency() agencyId: string,
    @Param('id') id: string,
    @Body() dto: RejectBookingDto,
  ) {
    return this.bookingsService.reject(id, agencyId, dto);
  }

  @Patch(':id/start')
  start(@CurrentAgency() agencyId: string, @Param('id') id: string) {
    return this.bookingsService.start(id, agencyId);
  }

  @Patch(':id/complete')
  complete(@CurrentAgency() agencyId: string, @Param('id') id: string) {
    return this.bookingsService.complete(id, agencyId);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentAgency() agencyId: string,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, agencyId, dto);
  }

  @Post(':id/mark-paid-cash')
  async markPaidCash(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.paymentsService.markBookingPaidCash(id, agencyId, user.sub);
    return this.bookingsService.findByIdDashboard(id, agencyId);
  }
}
