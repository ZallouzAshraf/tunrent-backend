import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Governorate } from '../../../common/enums';

export class CreateAgencyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @Matches(/^\+216\d{8}$/, {
    message: 'Phone must be in format +216XXXXXXXX',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+216\d{8}$/, {
    message: 'WhatsApp phone must be in format +216XXXXXXXX',
  })
  phoneWhatsapp?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsEnum(Governorate)
  governorate: Governorate;

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

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ownerFirstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ownerLastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  ownerPassword?: string;
}
