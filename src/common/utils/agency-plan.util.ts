import { ForbiddenException } from '@nestjs/common';
import { PLAN_LIMITS } from '../constants/plan-pricing';
import { AgencyPlan, AgencyStatus } from '../enums';
import type { Agency } from '../../modules/agencies/entities/agency.entity';

export function isAgencyPlanExpired(agency: Agency): boolean {
  if (agency.plan === AgencyPlan.FREE || !agency.planExpiresAt) {
    return false;
  }

  return new Date(agency.planExpiresAt) < new Date();
}

export function getEffectiveAgencyPlan(agency: Agency): AgencyPlan {
  if (isAgencyPlanExpired(agency)) {
    return AgencyPlan.FREE;
  }

  return agency.plan as AgencyPlan;
}

export function getEffectivePlanLimits(agency: Agency): {
  plan: AgencyPlan;
  maxCars: number;
  maxUsers: number;
  expired: boolean;
} {
  const plan = getEffectiveAgencyPlan(agency);
  const limits = PLAN_LIMITS[plan];

  return {
    plan,
    maxCars: limits.maxCars,
    maxUsers: limits.maxUsers,
    expired: isAgencyPlanExpired(agency),
  };
}

export function assertAgencyCanOperate(agency: Agency): void {
  switch (agency.status) {
    case AgencyStatus.SUSPENDED:
      throw new ForbiddenException('AGENCY_SUSPENDED');
    case AgencyStatus.REJECTED:
      throw new ForbiddenException('AGENCY_REJECTED');
    case AgencyStatus.PENDING_VALIDATION:
      throw new ForbiddenException('AGENCY_PENDING_VALIDATION');
    default:
      break;
  }
}

export function isAgencyOperational(agency: Agency): boolean {
  return agency.status === AgencyStatus.ACTIVE;
}
