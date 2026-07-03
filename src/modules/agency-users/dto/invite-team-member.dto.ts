import { IsEmail, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { AgencyUserRole } from '../../../common/enums';

export class InviteTeamMemberDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsEnum(AgencyUserRole)
  @IsNotEmpty()
  role: AgencyUserRole;
}
