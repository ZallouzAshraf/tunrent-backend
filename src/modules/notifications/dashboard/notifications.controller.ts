import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { NotificationsService } from '../notifications.service';

@Controller('dashboard/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findByUser(
    @CurrentUser() user: JwtPayload,
    @Query('agencyId') agencyId?: string,
  ) {
    return this.notificationsService.findByUser(user.sub, agencyId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(id, user.sub);
  }

  @Patch('read-all')
  markAllRead(
    @CurrentUser() user: JwtPayload,
    @Query('agencyId') agencyId?: string,
  ) {
    return this.notificationsService.markAllRead(user.sub, agencyId);
  }
}
