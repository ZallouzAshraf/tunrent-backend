import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/decorators/current-user.decorator';
import { CurrentAgency } from '../../common/decorators/current-agency.decorator';
import { Public, Roles } from '../../common/decorators/roles.decorator';
import { AgencyMemberGuard } from '../../common/guards/agency-member.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AgencyUserRole } from '../../common/enums';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  create(@Body() dto: CreateAgencyDto, @Req() req: AuthenticatedRequest) {
    return this.agenciesService.create(dto, req.user?.sub);
  }
}

@Controller('dashboard/agency')
@UseGuards(JwtAuthGuard, AgencyMemberGuard, RolesGuard)
@Roles(AgencyUserRole.OWNER)
export class DashboardAgencyController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Get()
  getOwnAgency(@CurrentAgency() agencyId: string) {
    return this.agenciesService.findById(agencyId, agencyId);
  }

  @Put()
  updateOwnAgency(
    @CurrentAgency() agencyId: string,
    @Body() dto: UpdateAgencyDto,
  ) {
    return this.agenciesService.update(agencyId, dto, agencyId);
  }
}
