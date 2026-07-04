import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateClientReviewDto {
  @IsUUID()
  bookingId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  ratingOverall: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ratingCarCondition?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ratingService?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ratingValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
