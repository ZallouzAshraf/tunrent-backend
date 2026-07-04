import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Agency } from '../agencies/entities/agency.entity';
import { BillingService } from './billing.service';
import { DashboardBillingController } from './billing.controller';
import { PlanChangeRequest } from './entities/plan-change-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlanChangeRequest, Agency]), AuthModule],
  controllers: [DashboardBillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
