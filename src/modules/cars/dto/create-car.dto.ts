import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CarCategory,
  CarStatus,
  FuelType,
  Transmission,
} from '../../../common/enums';

export class PickupLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  @IsInt()
  @Min(1990)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsString()
  @Matches(/^[0-9]{3}TU[0-9]{4}$/, {
    message: 'Registration number must match Tunisian format (e.g. 123TU4567)',
  })
  registrationNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(17)
  vin?: string;

  @IsEnum(CarCategory)
  category: CarCategory;

  @IsEnum(Transmission)
  transmission: Transmission;

  @IsEnum(FuelType)
  fuelType: FuelType;

  @IsInt()
  @Min(1)
  @Max(50)
  seats: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(6)
  doors?: number;

  @IsOptional()
  @IsBoolean()
  hasAc?: boolean;

  @IsOptional()
  @IsBoolean()
  hasGps?: boolean;

  @IsOptional()
  @IsBoolean()
  hasBluetooth?: boolean;

  @IsOptional()
  @IsBoolean()
  hasUsb?: boolean;

  @IsOptional()
  @IsBoolean()
  hasChildSeat?: boolean;

  @IsOptional()
  @IsBoolean()
  hasInsurance?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  @Max(5000)
  pricePerDay: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  pricePerWeek?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minRentalDays?: number;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(99)
  minDriverAge?: number;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickupLocationDto)
  pickupLocations?: PickupLocationDto[];
}
