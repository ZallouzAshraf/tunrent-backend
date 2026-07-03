import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsString()
  agencyNotes?: string;
}

export class CancelClientBookingDto {
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
