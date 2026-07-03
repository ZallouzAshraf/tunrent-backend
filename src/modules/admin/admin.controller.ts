import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GlobalRoles } from '../../common/decorators/roles.decorator';
import { RoleGlobal, AgencyStatus } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { RejectAgencyDto } from './dto/reject-agency.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@GlobalRoles(RoleGlobal.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
