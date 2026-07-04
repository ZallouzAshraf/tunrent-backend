import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { GlobalRoles } from '../../common/decorators/roles.decorator';
import {
  AgencyStatus,
  PlanChangeRequestStatus,
  RoleGlobal,
} from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BillingService } from '../billing/billing.service';
import { RejectPlanChangeRequestDto } from '../billing/dto/reject-plan-change-request.dto';
import { AdminService } from './admin.service';
import { RejectAgencyDto } from './dto/reject-agency.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@GlobalRoles(RoleGlobal.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly billingService: BillingService,
  ) {}

  @Get('agencies')
  listAgencies(
    @Query('status') status?: AgencyStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listAgencies({ status, search, page, limit });
  }

  @Get('agencies/:id')
  getAgency(@Param('id') id: string) {
    return this.adminService.getAgency(id);
  }

  @Patch('agencies/:id/approve')
  approve(@Param('id') id: string) {
    return this.adminService.approve(id);
  }

  @Patch('agencies/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectAgencyDto) {
    return this.adminService.reject(id, dto.reason);
  }

  @Patch('agencies/:id/suspend')
  suspend(@Param('id') id: string) {
    return this.adminService.suspend(id);
  }

  @Get('users')
  listUsers(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listUsers({ search, page, limit });
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('plan-requests')
  listPlanRequests(
    @Query('status') status?: PlanChangeRequestStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.billingService.listAllPlanRequests({ status, page, limit });
  }

  @Patch('plan-requests/:id/approve')
  approvePlanRequest(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.approvePlanRequest(id, user.sub);
  }

  @Patch('plan-requests/:id/reject')
  rejectPlanRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectPlanChangeRequestDto,
  ) {
    return this.billingService.rejectPlanRequest(id, user.sub, dto.adminNote);
  }
}
