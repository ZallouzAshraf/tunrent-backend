import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAgency } from '../../../common/decorators/current-agency.decorator';
import { AgencyMemberGuard } from '../../../common/guards/agency-member.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ReplyReviewDto } from '../dto/reply-review.dto';
import { ReviewQueryDto } from '../dto/review-query.dto';
import { ToggleVisibilityDto } from '../dto/toggle-visibility.dto';
import { ReviewsService } from '../reviews.service';

@Controller('dashboard/reviews')
@UseGuards(JwtAuthGuard, AgencyMemberGuard)
export class DashboardReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll(
    @CurrentAgency() agencyId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findAll(agencyId, query);
  }

  @Post(':id/reply')
  reply(
    @CurrentAgency() agencyId: string,
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(id, agencyId, dto.agencyReply);
  }

  @Patch(':id/visibility')
  toggleVisibility(
    @CurrentAgency() agencyId: string,
    @Param('id') id: string,
    @Body() dto: ToggleVisibilityDto,
  ) {
    return this.reviewsService.toggleVisibility(id, agencyId, dto.isVisible);
  }
}
