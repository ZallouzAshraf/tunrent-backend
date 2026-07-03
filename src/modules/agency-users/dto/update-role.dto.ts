import { IsEnum, IsNotEmpty } from 'class-validator';
import { AgencyUserRole } from '../../../common/enums';

export class UpdateRoleDto {
  @IsEnum(AgencyUserRole)
  @IsNotEmpty()
  role: AgencyUserRole;
}
