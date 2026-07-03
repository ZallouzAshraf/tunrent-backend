import { AgencyPlan } from '../enums';

export const PLAN_MONTHLY_PRICES: Record<AgencyPlan, number | null> = {
  [AgencyPlan.FREE]: 0,
  [AgencyPlan.STARTER]: 50,
  [AgencyPlan.PRO]: 80,
  [AgencyPlan.ENTERPRISE]: 140,
};

export const PLAN_LIMITS: Record<
  AgencyPlan,
  { maxCars: number; maxUsers: number; label: string }
> = {
  [AgencyPlan.FREE]: { maxCars: 5, maxUsers: 2, label: 'Gratuit' },
  [AgencyPlan.STARTER]: { maxCars: 10, maxUsers: 2, label: 'Starter' },
  [AgencyPlan.PRO]: { maxCars: 999, maxUsers: 10, label: 'Pro' },
  [AgencyPlan.ENTERPRISE]: { maxCars: 999, maxUsers: 50, label: 'Enterprise' },
};

export const BILLABLE_PLANS = [
  AgencyPlan.STARTER,
  AgencyPlan.PRO,
  AgencyPlan.ENTERPRISE,
] as const;

export function getPlanMonthlyPrice(plan: AgencyPlan): number {
  return PLAN_MONTHLY_PRICES[plan] ?? 0;
}
