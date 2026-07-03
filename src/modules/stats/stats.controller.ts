import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AgencyMemberGuard } from '../../common/guards/agency-member.guard';
import { CurrentAgency } from '../../common/decorators/current-agency.decorator';

@ApiTags('Dashboard Stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AgencyMemberGuard)
@Controller('dashboard/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  getOverview(@CurrentAgency() agencyId: string) {
    return this.statsService.getOverview(agencyId);
  }

  @Get('bookings-chart')
  getBookingsChart(
    @CurrentAgency() agencyId: string,
    @Query('months') months?: number,
  ) {
    return this.statsService.getBookingsChart(agencyId, months || 6);
  }

  @Get('cars')
  getTopCars(
    @CurrentAgency() agencyId: string,
    @Query('limit') limit?: number,
  ) {
    return this.statsService.getTopCars(agencyId, limit || 5);
  }
}
