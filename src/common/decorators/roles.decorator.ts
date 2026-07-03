import { SetMetadata } from '@nestjs/common';
import { AgencyUserRole, RoleGlobal } from '../enums';

export const ROLES_KEY = 'roles';
export const GLOBAL_ROLES_KEY = 'globalRoles';

export const Roles = (...roles: AgencyUserRole[]) =>
  SetMetadata(ROLES_KEY, roles);

export const GlobalRoles = (...roles: RoleGlobal[]) =>
  SetMetadata(GLOBAL_ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
