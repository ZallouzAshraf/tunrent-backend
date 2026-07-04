import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../modules/audit/entities/audit-log.entity';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.auditLogRepo
          .save({
            agencyId: request.agencyId || request.user?.agencyId || null,
            userId: request.user?.sub || null,
            action: `${String(request.route?.path ?? request.url)}:${method}`,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || null,
          })
          .catch(() => {
            // Audit failures should not break the request
          });
      }),
    );
  }
}
