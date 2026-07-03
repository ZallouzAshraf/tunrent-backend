import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAgency } from '../../../common/decorators/current-agency.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AgencyMemberGuard } from '../../../common/guards/agency-member.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { PaymentsService } from '../payments.service';

@Controller('dashboard/payments')
@UseGuards(JwtAuthGuard, AgencyMemberGuard)
export class DashboardPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(
    @CurrentAgency() agencyId: string,
    @Query() query: PaymentQueryDto,
  ) {
    return this.paymentsService.findAll(agencyId, query);
  }

  @Post()
  create(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(agencyId, dto, user.sub);
  }

  @Get(':id')
  findById(@CurrentAgency() agencyId: string, @Param('id') id: string) {
    return this.paymentsService.findById(id, agencyId);
  }
}
