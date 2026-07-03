import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { AvailabilityService } from './availability.service';
import { CreateBlockDto } from './dto/create-block.dto';

@Controller('dashboard/availability')
@UseGuards(JwtAuthGuard, AgencyMemberGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post('block')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER, AgencyUserRole.MANAGER)
  createBlock(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBlockDto,
  ) {
    return this.availabilityService.createBlock(agencyId, dto, user.sub);
  }

  @Delete('block/:id')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER, AgencyUserRole.MANAGER)
  deleteBlock(
    @CurrentAgency() agencyId: string,
    @Param('id') blockId: string,
  ) {
    return this.availabilityService.deleteBlock(blockId, agencyId);
  }

  @Get(':carId')
  getCarAvailability(
    @CurrentAgency() agencyId: string,
    @Param('carId') carId: string,
  ) {
    return this.availabilityService.getCarAvailability(carId, agencyId);
  }
}
