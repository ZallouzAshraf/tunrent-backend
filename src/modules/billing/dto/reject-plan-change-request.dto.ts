import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectPlanChangeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
