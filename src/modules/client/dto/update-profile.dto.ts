import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  cin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  drivingLicenseNumber?: string;

  @IsOptional()
  @IsString()
  cinPhotoUrl?: string;

  @IsOptional()
  @IsString()
  drivingLicensePhotoUrl?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
