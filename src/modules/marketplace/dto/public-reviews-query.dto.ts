import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { MAX_LIMIT } from '../../../common/utils/pagination.util';

export class PublicReviewsQueryDto {
  @IsOptional()
  @IsUUID()
  carId?: string;

  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;
}
