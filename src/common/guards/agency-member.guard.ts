import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencyUser } from '../../modules/agency-users/entities/agency-user.entity';
import { Agency } from '../../modules/agencies/entities/agency.entity';
import { AgencyUserStatus } from '../enums';
import { assertAgencyCanOperate } from '../utils/agency-plan.util';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class AgencyMemberGuard implements CanActivate {
  constructor(
    @InjectRepository(AgencyUser)
    private readonly agencyUserRepo: Repository<AgencyUser>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const agencyId =
      request.params?.agencyId ||
      request.headers['x-agency-id'] ||
      user.agencyId;

    if (!agencyId || typeof agencyId !== 'string') {
      throw new ForbiddenException('Agency context required');
    }

    const membership = await this.agencyUserRepo.findOne({
      where: {
        agencyId,
        userId: user.sub,
        status: AgencyUserStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this agency');
    }

    const agency = await this.agencyRepo.findOne({ where: { id: agencyId } });
    if (!agency) {
      throw new ForbiddenException('Agency not found');
    }

    assertAgencyCanOperate(agency);

    request.agencyId = agencyId;
    request.agencyRole = membership.role;
    return true;
  }
}
