import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import {
  AgencyUserRole,
  AgencyUserStatus,
  RoleGlobal,
} from '../../common/enums';
import {
  assertAgencyCanOperate,
  getEffectivePlanLimits,
} from '../../common/utils/agency-plan.util';
import { Agency } from '../agencies/entities/agency.entity';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AgencyUser } from './entities/agency-user.entity';

const INVITATION_EXPIRY_HOURS = 72;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AgencyUsersService {
  constructor(
    @InjectRepository(AgencyUser)
    private readonly agencyUserRepo: Repository<AgencyUser>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async invite(
    agencyId: string,
    dto: InviteTeamMemberDto,
    invitedByUserId: string,
  ): Promise<{ message: string; membership: AgencyUser }> {
    if (dto.role === AgencyUserRole.OWNER) {
      throw new BadRequestException('Cannot invite a member as owner');
    }

    const agency = await this.agencyRepo.findOne({ where: { id: agencyId } });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    assertAgencyCanOperate(agency);
    const { maxUsers } = getEffectivePlanLimits(agency);
    await this.assertTeamCapacity(agencyId, maxUsers);

    const email = dto.email.toLowerCase().trim();
    let user = await this.userRepo.findOne({ where: { email } });

    if (user) {
      const existing = await this.agencyUserRepo.findOne({
        where: { agencyId, userId: user.id },
      });

      if (existing) {
        if (existing.status === AgencyUserStatus.INVITED) {
          throw new ConflictException('An invitation is already pending for this user');
        }
        throw new ConflictException('User is already a member of this agency');
      }
    } else {
      const tempPassword = randomBytes(32).toString('hex');
      user = await this.userRepo.save(
        this.userRepo.create({
          firstName: email.split('@')[0] ?? 'Invited',
          lastName: 'Member',
          email,
          passwordHash: await bcrypt.hash(tempPassword, BCRYPT_ROUNDS),
          roleGlobal: RoleGlobal.CLIENT,
        }),
      );
    }

    const invitationToken = randomBytes(32).toString('hex');
    const inviter = await this.userRepo.findOne({ where: { id: invitedByUserId } });

    const membership = this.agencyUserRepo.create({
      agencyId,
      userId: user.id,
      role: dto.role,
      status: AgencyUserStatus.INVITED,
      invitationToken: this.hashToken(invitationToken),
      invitationExpiresAt: this.addHours(INVITATION_EXPIRY_HOURS),
      invitedByUserId,
    });

    const saved = await this.agencyUserRepo.save(membership);

    const frontendUrl = this.configService.get<string>('app.frontendUrl')!;
    await this.mailService.sendTeamInvitation(email, {
      inviteeEmail: email,
      agencyName: agency.name,
      role: dto.role,
      invitedByName: inviter
        ? `${inviter.firstName} ${inviter.lastName}`
        : 'Agency owner',
      invitationUrl: `${frontendUrl}/dashboard/accept-invitation?token=${invitationToken}`,
    });

    return {
      message: 'Invitation sent successfully',
      membership: saved,
    };
  }

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<{ message: string; membership: AgencyUser }> {
    const tokenHash = this.hashToken(token);
    const membership = await this.agencyUserRepo.findOne({
      where: { invitationToken: tokenHash, status: AgencyUserStatus.INVITED },
      relations: { agency: true },
    });

    if (
      !membership ||
      !membership.invitationExpiresAt ||
      membership.invitationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMembership = await this.agencyUserRepo.findOne({
      where: { agencyId: membership.agencyId, userId },
    });

    if (existingMembership && existingMembership.id !== membership.id) {
      throw new ConflictException('You are already a member of this agency');
    }

    membership.userId = userId;
    membership.status = AgencyUserStatus.ACTIVE;
    membership.invitationToken = null;
    membership.invitationExpiresAt = null;

    const saved = await this.agencyUserRepo.save(membership);
    return { message: 'Invitation accepted successfully', membership: saved };
  }

  async findTeam(agencyId: string): Promise<AgencyUser[]> {
    return this.agencyUserRepo.find({
      where: { agencyId },
      relations: { user: true, invitedBy: true },
      order: { createdAt: 'ASC' },
    });
  }

  async updateRole(
    agencyId: string,
    memberId: string,
    dto: UpdateRoleDto,
  ): Promise<AgencyUser> {
    const member = await this.findMemberOrFail(agencyId, memberId);

    if (member.role === AgencyUserRole.OWNER) {
      throw new ForbiddenException('Cannot change the owner role');
    }

    if (dto.role === AgencyUserRole.OWNER) {
      throw new BadRequestException('Cannot assign owner role via team management');
    }

    member.role = dto.role;
    return this.agencyUserRepo.save(member);
  }

  async suspend(agencyId: string, memberId: string): Promise<AgencyUser> {
    const member = await this.findMemberOrFail(agencyId, memberId);

    if (member.role === AgencyUserRole.OWNER) {
      throw new ForbiddenException('Cannot suspend the agency owner');
    }

    member.status = AgencyUserStatus.SUSPENDED;
    return this.agencyUserRepo.save(member);
  }

  async remove(agencyId: string, memberId: string): Promise<{ message: string }> {
    const member = await this.findMemberOrFail(agencyId, memberId);

    if (member.role === AgencyUserRole.OWNER) {
      throw new ForbiddenException('Cannot remove the agency owner');
    }

    await this.agencyUserRepo.remove(member);
    return { message: 'Team member removed successfully' };
  }

  private async findMemberOrFail(
    agencyId: string,
    memberId: string,
  ): Promise<AgencyUser> {
    const member = await this.agencyUserRepo.findOne({
      where: { id: memberId, agencyId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    return member;
  }

  private async assertTeamCapacity(
    agencyId: string,
    maxUsers: number,
  ): Promise<void> {
    const currentCount = await this.agencyUserRepo.count({
      where: [
        { agencyId, status: AgencyUserStatus.ACTIVE },
        { agencyId, status: AgencyUserStatus.INVITED },
      ],
    });

    if (currentCount >= maxUsers) {
      throw new BadRequestException(
        `Team member limit reached (${maxUsers} users maximum for your plan)`,
      );
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private addHours(hours: number): Date {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  }
}
