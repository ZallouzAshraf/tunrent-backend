import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AgencyUsersService } from './agency-users.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@Controller('team')
export class TeamInvitationController {
  constructor(private readonly agencyUsersService: AgencyUsersService) {}

  @Post('accept-invitation')
  @UseGuards(JwtAuthGuard)
  acceptInvitation(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.agencyUsersService.acceptInvitation(dto.token, user.sub);
  }
}
