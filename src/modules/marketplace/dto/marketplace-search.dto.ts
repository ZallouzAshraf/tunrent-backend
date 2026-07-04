import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  CarCategory,
  FuelType,
  Governorate,
  Transmission,
} from '../../../common/enums';
import { ParseQueryBoolean } from '../../../common/utils/parse-query-boolean.util';
import { MAX_LIMIT } from '../../../common/utils/pagination.util';
import { IsValidMarketplaceDateRange } from '../../../common/validators/marketplace-date-range.validator';

export enum MarketplaceSort {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING_DESC = 'rating_desc',
}

export class MarketplaceCarSearchDto {
  @IsOptional()
  @IsEnum(Governorate)
  governorate?: Governorate;

  @IsOptional()
  @IsEnum(CarCategory)
  category?: CarCategory;

  @IsOptional()
  @IsDateString()
  @IsValidMarketplaceDateRange()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_price?: number;

  @IsOptional()
  @IsEnum(Transmission)
  transmission?: Transmission;

  @IsOptional()
  @IsEnum(FuelType)
  fuel_type?: FuelType;

  @IsOptional()
  @ParseQueryBoolean()
  @IsBoolean()
  has_ac?: boolean;

  @IsOptional()
  @ParseQueryBoolean()
  @IsBoolean()
  has_gps?: boolean;

  @IsOptional()
  @ParseQueryBoolean()
  @IsBoolean()
  has_bluetooth?: boolean;

  @IsOptional()
  @ParseQueryBoolean()
  @IsBoolean()
  has_child_seat?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(MarketplaceSort)
  sort?: MarketplaceSort;

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

export class MarketplaceAgencySearchDto {
  @IsOptional()
  @IsEnum(Governorate)
  governorate?: Governorate;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @ParseQueryBoolean()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsEnum(MarketplaceSort)
  sort?: MarketplaceSort;

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
