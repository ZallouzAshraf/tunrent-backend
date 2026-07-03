import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { AgencyUser } from '../agency-users/entities/agency-user.entity';
import { MailModule } from '../mail/mail.module';
import { User } from '../users/entities/user.entity';
import {
  AgenciesController,
  DashboardAgencyController,
} from './agencies.controller';
import { AgenciesService } from './agencies.service';
import { Agency } from './entities/agency.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agency, AgencyUser, User]),
    MailModule,
    AuthModule,
  ],
  controllers: [AgenciesController, DashboardAgencyController],
  providers: [AgenciesService, OptionalJwtAuthGuard],
  exports: [AgenciesService, TypeOrmModule],
})
export class AgenciesModule {}
