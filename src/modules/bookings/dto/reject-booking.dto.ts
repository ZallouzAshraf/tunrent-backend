import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RejectBookingDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;

  @IsOptional()
  @IsString()
  agencyNotes?: string;
}
