import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentAgency } from '../../common/decorators/current-agency.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AgencyUserRole } from '../../common/enums';
import { AgencyMemberGuard } from '../../common/guards/agency-member.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { AgencyUsersService } from './agency-users.service';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('dashboard/team')
@UseGuards(JwtAuthGuard, AgencyMemberGuard)
export class AgencyUsersController {
  constructor(private readonly agencyUsersService: AgencyUsersService) {}

  @Get()
  findTeam(@CurrentAgency() agencyId: string) {
    return this.agencyUsersService.findTeam(agencyId);
  }

  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER)
  invite(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteTeamMemberDto,
  ) {
    return this.agencyUsersService.invite(agencyId, dto, user.sub);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER)
  updateRole(
    @CurrentAgency() agencyId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.agencyUsersService.updateRole(agencyId, id, dto);
  }

  @Patch(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER)
  suspend(
    @CurrentAgency() agencyId: string,
    @Param('id', ParseUuidPipe) id: string,
  ) {
    return this.agencyUsersService.suspend(agencyId, id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER)
  remove(
    @CurrentAgency() agencyId: string,
    @Param('id', ParseUuidPipe) id: string,
  ) {
    return this.agencyUsersService.remove(agencyId, id);
  }
}
