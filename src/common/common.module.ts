import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgencyUser } from '../modules/agency-users/entities/agency-user.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { AgencyMemberGuard } from './guards/agency-member.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AgencyUser, AuditLog])],
  providers: [AgencyMemberGuard, RolesGuard, AuditInterceptor],
  exports: [
    TypeOrmModule,
    AgencyMemberGuard,
    RolesGuard,
    AuditInterceptor,
  ],
})
export class CommonModule {}
