import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { ReviewsService } from '../reviews/reviews.service';
import { ClientService } from './client.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateClientReviewDto } from './dto/create-client-review.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('client')
@UseGuards(JwtAuthGuard)
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly notificationsService: NotificationsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.clientService.updateProfile(user.sub, dto);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.clientService.changePassword(user.sub, dto);
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.findByUser(user.sub);
  }

  @Patch('notifications/:id/read')
  markNotificationRead(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(id, user.sub);
  }

  @Get('reviews')
  getReviews(@CurrentUser() user: JwtPayload) {
    return this.reviewsService.findByClient(user.sub);
  }

  @Post('reviews')
  createReview(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateClientReviewDto,
  ) {
    return this.reviewsService.create({
      ...dto,
      clientUserId: user.sub,
    });
  }
}
