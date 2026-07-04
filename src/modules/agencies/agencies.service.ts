import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  AgencyStatus,
  AgencyUserRole,
  AgencyUserStatus,
  RoleGlobal,
} from '../../common/enums';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginationOptions,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import { generateSlug, generateUniqueSlug } from '../../common/utils/slug.util';
import { AgencyUser } from '../agency-users/entities/agency-user.entity';
import { resolveAdminRecipient } from '../../config/mail.config';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { Agency } from './entities/agency.entity';

const BCRYPT_ROUNDS = 12;

export interface FindAllAgenciesOptions extends PaginationOptions {
  status?: AgencyStatus;
  governorate?: string;
  search?: string;
}

@Injectable()
export class AgenciesService {
  private readonly logger = new Logger(AgenciesService.name);

  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(AgencyUser)
    private readonly agencyUserRepo: Repository<AgencyUser>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    dto: CreateAgencyDto,
    ownerUserId?: string,
  ): Promise<{ agency: Agency; ownerUserId: string }> {
    const slug = await this.generateUniqueSlug(dto.name);

    if (ownerUserId) {
      const owner = await this.userRepo.findOne({ where: { id: ownerUserId } });
      if (!owner || !owner.isActive) {
        throw new BadRequestException('Invalid owner account');
      }

      const existingMembership = await this.agencyUserRepo.findOne({
        where: { userId: ownerUserId, role: AgencyUserRole.OWNER },
      });
      if (existingMembership) {
        throw new ConflictException('User already owns an agency');
      }

      const agency = await this.saveAgency(dto, slug);
      await this.createOwnerMembership(agency.id, ownerUserId);
      await this.notifyAgencyPending(agency, owner);

      return { agency, ownerUserId };
    }

    if (
      !dto.ownerFirstName ||
      !dto.ownerLastName ||
      !dto.ownerEmail ||
      !dto.ownerPassword
    ) {
      throw new BadRequestException(
        'Owner account details are required for public registration',
      );
    }

    const ownerEmail = dto.ownerEmail.toLowerCase().trim();
    const existingUser = await this.userRepo.findOne({
      where: { email: ownerEmail },
    });
    if (existingUser) {
      throw new ConflictException('Owner email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, BCRYPT_ROUNDS);
    const owner = this.userRepo.create({
      firstName: dto.ownerFirstName.trim(),
      lastName: dto.ownerLastName.trim(),
      email: ownerEmail,
      passwordHash,
      phone: dto.phone,
      roleGlobal: RoleGlobal.CLIENT,
    });
    const savedOwner = await this.userRepo.save(owner);

    const agency = await this.saveAgency(dto, slug);
    await this.createOwnerMembership(agency.id, savedOwner.id);
    await this.notifyAgencyPending(agency, savedOwner);

    return { agency, ownerUserId: savedOwner.id };
  }

  async findAll(
    options: FindAllAgenciesOptions = {},
  ): Promise<PaginatedResult<Agency>> {
    const { page, limit, skip } = normalizePagination(options);

    const qb = this.agencyRepo
      .createQueryBuilder('agency')
      .orderBy('agency.createdAt', 'DESC');

    if (options.status) {
      qb.andWhere('agency.status = :status', { status: options.status });
    }

    if (options.governorate) {
      qb.andWhere('agency.governorate = :governorate', {
        governorate: options.governorate,
      });
    }

    if (options.search) {
      qb.andWhere(
        '(agency.name ILIKE :search OR agency.city ILIKE :search OR agency.email ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string, agencyId?: string): Promise<Agency> {
    if (agencyId && agencyId !== id) {
      throw new NotFoundException('Agency not found');
    }

    const agency = await this.agencyRepo.findOne({ where: { id } });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }
    return agency;
  }

  async findBySlug(slug: string): Promise<Agency> {
    const agency = await this.agencyRepo.findOne({ where: { slug } });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }
    return agency;
  }

  async update(
    id: string,
    dto: UpdateAgencyDto,
    agencyId?: string,
  ): Promise<Agency> {
    const agency = await this.findById(id, agencyId);

    if (dto.name && dto.name !== agency.name) {
      agency.slug = await this.generateUniqueSlug(dto.name, agency.id);
    }

    Object.assign(agency, {
      ...dto,
      email: dto.email?.toLowerCase().trim() ?? agency.email,
    });

    return this.agencyRepo.save(agency);
  }

  async softDelete(
    id: string,
    agencyId?: string,
  ): Promise<{ message: string }> {
    const agency = await this.findById(id, agencyId);
    await this.agencyRepo.softRemove(agency);
    return { message: 'Agency deleted successfully' };
  }

  private resolveInitialAgencyStatus(): AgencyStatus {
    const nodeEnv = this.configService.get<string>('app.nodeEnv');
    // En dev, activer directement pour la marketplace (prod = validation admin)
    if (nodeEnv === 'development') {
      return AgencyStatus.ACTIVE;
    }
    return AgencyStatus.PENDING_VALIDATION;
  }

  private async saveAgency(
    dto: CreateAgencyDto,
    slug: string,
  ): Promise<Agency> {
    const agency = this.agencyRepo.create({
      name: dto.name.trim(),
      slug,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      coverUrl: dto.coverUrl ?? null,
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone,
      phoneWhatsapp: dto.phoneWhatsapp ?? null,
      address: dto.address,
      city: dto.city.trim(),
      governorate: dto.governorate,
      postalCode: dto.postalCode ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      patenteNumber: dto.patenteNumber ?? null,
      patenteUrl: dto.patenteUrl ?? null,
      rib: dto.rib ?? null,
      status: this.resolveInitialAgencyStatus(),
    });

    return this.agencyRepo.save(agency);
  }

  private async createOwnerMembership(
    agencyId: string,
    userId: string,
  ): Promise<AgencyUser> {
    const membership = this.agencyUserRepo.create({
      agencyId,
      userId,
      role: AgencyUserRole.OWNER,
      status: AgencyUserStatus.ACTIVE,
    });

    return this.agencyUserRepo.save(membership);
  }

  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let attempt = 0;

    while (await this.slugExists(slug, excludeId)) {
      attempt += 1;
      slug = generateUniqueSlug(name, String(attempt));
    }

    return slug;
  }

  private async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const qb = this.agencyRepo
      .createQueryBuilder('agency')
      .where('agency.slug = :slug', { slug });

    if (excludeId) {
      qb.andWhere('agency.id != :excludeId', { excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  private async notifyAgencyPending(
    agency: Agency,
    owner: User,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl')!;
    const adminEmail = resolveAdminRecipient(
      this.configService.get<string>('mail.adminEmail'),
      this.configService.get<string>('mail.from'),
      agency.email,
    );

    try {
      await this.mailService.sendAgencyPending(adminEmail, {
        agencyName: agency.name,
        ownerName: `${owner.firstName} ${owner.lastName}`,
        ownerEmail: owner.email,
        city: agency.city,
        adminDashboardUrl: `${frontendUrl}/admin/agencies`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send agency pending notification for ${agency.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
