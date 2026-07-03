import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AgencyPlan } from '../../../common/enums';

export class CreatePlanChangeRequestDto {
  @IsEnum(AgencyPlan)
  requestedPlan: AgencyPlan;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
