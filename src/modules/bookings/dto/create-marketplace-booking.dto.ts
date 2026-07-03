import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsValidBookingDateRange } from '../../../common/validators/booking-date-range.validator';

export class CreateMarketplaceBookingDto {
  @IsUUID()
  carId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  clientFirstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  clientLastName: string;

  @IsEmail()
  @MaxLength(255)
  clientEmail: string;

  @IsString()
  @Matches(/^\+216[0-9]{8}$/, {
    message: 'Phone must be a valid Tunisian number (+216XXXXXXXX)',
  })
  clientPhone: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{8}$/, { message: 'CIN must be 8 digits' })
  clientCin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  clientDrivingLicense?: string;

  @IsDateString()
  @IsValidBookingDateRange()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  pickupLocation: string;

  @IsString()
  @IsNotEmpty()
  dropoffLocation: string;

  @IsOptional()
  @IsString()
  clientNotes?: string;
}
