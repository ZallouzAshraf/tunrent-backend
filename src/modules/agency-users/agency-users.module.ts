import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Agency } from '../agencies/entities/agency.entity';
import { MailModule } from '../mail/mail.module';
import { User } from '../users/entities/user.entity';
import { AgencyUsersController } from './agency-users.controller';
import { AgencyUsersService } from './agency-users.service';
import { TeamInvitationController } from './team-invitation.controller';
import { AgencyUser } from './entities/agency-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgencyUser, Agency, User]),
    MailModule,
    AuthModule,
  ],
  controllers: [AgencyUsersController, TeamInvitationController],
  providers: [AgencyUsersService],
  exports: [AgencyUsersService, TypeOrmModule],
})
export class AgencyUsersModule {}
