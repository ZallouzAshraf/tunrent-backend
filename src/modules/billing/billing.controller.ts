import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentAgency } from '../../common/decorators/current-agency.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AgencyUserRole } from '../../common/enums';
import { AgencyMemberGuard } from '../../common/guards/agency-member.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BillingService } from './billing.service';
import { CreatePlanChangeRequestDto } from './dto/create-plan-change-request.dto';

@Controller('dashboard/billing')
@UseGuards(JwtAuthGuard, AgencyMemberGuard, RolesGuard)
@Roles(AgencyUserRole.OWNER)
export class DashboardBillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plan-requests')
  listPlanRequests(@CurrentAgency() agencyId: string) {
    return this.billingService.listAgencyPlanRequests(agencyId);
  }

  @Get('plan-requests/pending')
  getPendingRequest(@CurrentAgency() agencyId: string) {
    return this.billingService.getPendingAgencyRequest(agencyId);
  }

  @Post('plan-requests')
  createPlanRequest(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePlanChangeRequestDto,
  ) {
    return this.billingService.createPlanChangeRequest(agencyId, user.sub, dto);
  }

  @Delete('plan-requests/pending')
  cancelPendingRequest(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billingService.cancelPendingPlanRequest(agencyId, user.sub);
  }
}
