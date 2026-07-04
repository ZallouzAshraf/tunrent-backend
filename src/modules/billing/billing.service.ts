import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BILLABLE_PLANS,
  getPlanMonthlyPrice,
  PLAN_LIMITS,
} from '../../common/constants/plan-pricing';
import { PlanChangeRequestStatus } from '../../common/enums';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginationOptions,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import { Agency } from '../agencies/entities/agency.entity';
import { CreatePlanChangeRequestDto } from './dto/create-plan-change-request.dto';
import { PlanChangeRequest } from './entities/plan-change-request.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(PlanChangeRequest)
    private readonly requestRepo: Repository<PlanChangeRequest>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
  ) {}

  async createPlanChangeRequest(
    agencyId: string,
    userId: string,
    dto: CreatePlanChangeRequestDto,
  ): Promise<PlanChangeRequest> {
    if (
      !BILLABLE_PLANS.includes(
        dto.requestedPlan as (typeof BILLABLE_PLANS)[number],
      )
    ) {
      throw new BadRequestException(
        'Seuls les plans Starter, Pro et Enterprise peuvent être demandés',
      );
    }

    const agency = await this.agencyRepo.findOne({ where: { id: agencyId } });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    if (agency.plan === dto.requestedPlan) {
      throw new BadRequestException('Vous êtes déjà sur ce plan');
    }

    const pending = await this.requestRepo.findOne({
      where: {
        agencyId,
        status: PlanChangeRequestStatus.PENDING,
      },
    });

    if (pending) {
      throw new BadRequestException(
        'Une demande de changement de plan est déjà en attente',
      );
    }

    const request = this.requestRepo.create({
      agencyId,
      requestedById: userId,
      currentPlan: agency.plan,
      requestedPlan: dto.requestedPlan,
      monthlyPrice: getPlanMonthlyPrice(dto.requestedPlan),
      note: dto.note?.trim() || null,
      status: PlanChangeRequestStatus.PENDING,
    });

    return this.requestRepo.save(request);
  }

  async listAgencyPlanRequests(agencyId: string): Promise<PlanChangeRequest[]> {
    return this.requestRepo.find({
      where: { agencyId },
      order: { createdAt: 'DESC' },
      relations: { requestedBy: true, processedBy: true },
    });
  }

  async getPendingAgencyRequest(
    agencyId: string,
  ): Promise<PlanChangeRequest | null> {
    return this.requestRepo.findOne({
      where: { agencyId, status: PlanChangeRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async listAllPlanRequests(
    options: PaginationOptions & { status?: PlanChangeRequestStatus } = {},
  ): Promise<PaginatedResult<PlanChangeRequest>> {
    const { page, limit, skip } = normalizePagination(options);

    const qb = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.agency', 'agency')
      .leftJoinAndSelect('request.requestedBy', 'requestedBy')
      .leftJoinAndSelect('request.processedBy', 'processedBy')
      .orderBy('request.createdAt', 'DESC');

    if (options.status) {
      qb.andWhere('request.status = :status', { status: options.status });
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async approvePlanRequest(
    id: string,
    adminUserId: string,
  ): Promise<PlanChangeRequest> {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: { agency: true },
    });

    if (!request) {
      throw new NotFoundException('Plan change request not found');
    }

    if (request.status !== PlanChangeRequestStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    const limits = PLAN_LIMITS[request.requestedPlan];
    const agency = request.agency;

    agency.plan = request.requestedPlan;
    agency.maxCars = limits.maxCars;
    agency.maxUsers = limits.maxUsers;
    agency.planExpiresAt = this.addOneMonth(new Date());

    await this.agencyRepo.save(agency);

    request.status = PlanChangeRequestStatus.APPROVED;
    request.processedById = adminUserId;
    request.processedAt = new Date();

    return this.requestRepo.save(request);
  }

  async rejectPlanRequest(
    id: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<PlanChangeRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });

    if (!request) {
      throw new NotFoundException('Plan change request not found');
    }

    if (request.status !== PlanChangeRequestStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    request.status = PlanChangeRequestStatus.REJECTED;
    request.processedById = adminUserId;
    request.processedAt = new Date();
    request.adminNote = adminNote?.trim() || null;

    return this.requestRepo.save(request);
  }

  async cancelPendingPlanRequest(
    agencyId: string,
    userId: string,
  ): Promise<PlanChangeRequest> {
    const request = await this.requestRepo.findOne({
      where: { agencyId, status: PlanChangeRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    if (!request) {
      throw new NotFoundException('Aucune demande en attente à annuler');
    }

    request.status = PlanChangeRequestStatus.CANCELLED;
    request.processedById = userId;
    request.processedAt = new Date();

    return this.requestRepo.save(request);
  }

  private addOneMonth(date: Date): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    return next;
  }
}
