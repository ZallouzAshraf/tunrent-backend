import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, GLOBAL_ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredGlobalRoles = this.reflector.getAllAndOverride<string[]>(
      GLOBAL_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length && !requiredGlobalRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (requiredGlobalRoles?.length) {
      if (!requiredGlobalRoles.includes(user.role)) {
        throw new ForbiddenException('Insufficient global permissions');
      }
      return true;
    }

    const agencyRole = request.agencyRole || user.agencyRole;
    if (!agencyRole || !requiredRoles.includes(agencyRole)) {
      throw new ForbiddenException('Insufficient agency permissions');
    }

    return true;
  }
}
