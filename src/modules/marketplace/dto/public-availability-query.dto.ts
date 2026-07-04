import { IsDateString, IsOptional } from 'class-validator';

export class PublicAvailabilityQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
