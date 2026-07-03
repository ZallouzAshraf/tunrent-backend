import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.headers.authorization) {
      return true;
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser = AuthenticatedRequest['user']>(
    err: Error | null,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser | undefined {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.headers.authorization) {
      return undefined;
    }

    if (err || !user) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    request.user = user as unknown as AuthenticatedRequest['user'];
    return user;
  }
}
