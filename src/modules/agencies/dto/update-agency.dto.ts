import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Governorate } from '../../../common/enums';

export class UpdateAgencyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+216\d{8}$/, {
    message: 'Phone must be in format +216XXXXXXXX',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+216\d{8}$/, {
    message: 'WhatsApp phone must be in format +216XXXXXXXX',
  })
  phoneWhatsapp?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsEnum(Governorate)
  governorate?: Governorate;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  patenteNumber?: string;

  @IsOptional()
  @IsString()
  patenteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rib?: string;
}
