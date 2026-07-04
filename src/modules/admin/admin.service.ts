import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AgencyStatus,
  AgencyUserRole,
  AgencyUserStatus,
} from '../../common/enums';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginationOptions,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import { AgencyUser } from '../agency-users/entities/agency-user.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Car } from '../cars/entities/car.entity';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';

export interface ListAgenciesOptions extends PaginationOptions {
  status?: AgencyStatus;
  search?: string;
}

export interface ListUsersOptions extends PaginationOptions {
  search?: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalAgencies: number;
  agenciesByStatus: Record<AgencyStatus, number>;
  totalCars: number;
  totalBookings: number;
  pendingAgencies: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(AgencyUser)
    private readonly agencyUserRepo: Repository<AgencyUser>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async listAgencies(
    options: ListAgenciesOptions = {},
  ): Promise<PaginatedResult<Agency>> {
    const { page, limit, skip } = normalizePagination(options);

    const qb = this.agencyRepo
      .createQueryBuilder('agency')
      .orderBy('agency.createdAt', 'DESC');

    if (options.status) {
      qb.andWhere('agency.status = :status', { status: options.status });
    }

    if (options.search?.trim()) {
      qb.andWhere(
        '(agency.name ILIKE :search OR agency.email ILIKE :search OR agency.city ILIKE :search)',
        { search: `%${options.search.trim()}%` },
      );
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async getAgency(id: string): Promise<Agency> {
    const agency = await this.agencyRepo.findOne({ where: { id } });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    return agency;
  }

  async approve(id: string): Promise<Agency> {
    const agency = await this.getAgency(id);

    if (agency.status === AgencyStatus.ACTIVE) {
      throw new BadRequestException('Agency is already active');
    }

    agency.status = AgencyStatus.ACTIVE;
    agency.rejectionReason = null;
    const saved = await this.agencyRepo.save(agency);

    await this.notifyAgencyApproved(saved);
    return saved;
  }

  async reject(id: string, reason: string): Promise<Agency> {
    const agency = await this.getAgency(id);

    if (agency.status === AgencyStatus.REJECTED) {
      throw new BadRequestException('Agency is already rejected');
    }

    agency.status = AgencyStatus.REJECTED;
    agency.rejectionReason = reason.trim();
    return this.agencyRepo.save(agency);
  }

  async suspend(id: string): Promise<Agency> {
    const agency = await this.getAgency(id);

    if (agency.status === AgencyStatus.SUSPENDED) {
      throw new BadRequestException('Agency is already suspended');
    }

    agency.status = AgencyStatus.SUSPENDED;
    return this.agencyRepo.save(agency);
  }

  async listUsers(
    options: ListUsersOptions = {},
  ): Promise<PaginatedResult<Omit<User, 'passwordHash'>>> {
    const { page, limit, skip } = normalizePagination(options);

    const qb = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (options.search?.trim()) {
      qb.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${options.search.trim()}%` },
      );
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const sanitized = data.map((user) => this.sanitizeUser(user));

    return buildPaginatedResult(sanitized, total, page, limit);
  }

  async getStats(): Promise<PlatformStats> {
    const [
      totalUsers,
      totalAgencies,
      totalCars,
      totalBookings,
      pendingAgencies,
      statusCounts,
    ] = await Promise.all([
      this.userRepo.count(),
      this.agencyRepo.count(),
      this.carRepo.count(),
      this.bookingRepo.count(),
      this.agencyRepo.count({
        where: { status: AgencyStatus.PENDING_VALIDATION },
      }),
      this.agencyRepo
        .createQueryBuilder('agency')
        .select('agency.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('agency.status')
        .getRawMany<{ status: AgencyStatus; count: string }>(),
    ]);

    const agenciesByStatus = Object.values(AgencyStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<AgencyStatus, number>,
    );

    for (const row of statusCounts) {
      agenciesByStatus[row.status] = Number(row.count);
    }

    return {
      totalUsers,
      totalAgencies,
      agenciesByStatus,
      totalCars,
      totalBookings,
      pendingAgencies,
    };
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private async notifyAgencyApproved(agency: Agency): Promise<void> {
    const ownerMembership = await this.agencyUserRepo.findOne({
      where: {
        agencyId: agency.id,
        role: AgencyUserRole.OWNER,
        status: AgencyUserStatus.ACTIVE,
      },
    });

    if (!ownerMembership) {
      return;
    }

    const owner = await this.userRepo.findOne({
      where: { id: ownerMembership.userId },
    });

    if (!owner) {
      return;
    }

    const frontendUrl = this.configService.get<string>('app.frontendUrl')!;

    try {
      await this.mailService.sendAgencyApproved(owner.email, {
        ownerName: `${owner.firstName} ${owner.lastName}`,
        agencyName: agency.name,
        dashboardUrl: `${frontendUrl}/dashboard`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send agency approved email for ${agency.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
