import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, from } from "rxjs";
import { lastValueFrom } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";
import { tenantContextStorage } from "../tenant-context";

/**
 * Wraps every request in a single database transaction and sets the
 * Postgres session variable Row-Level Security policies key on
 * (`app.current_tenant_id`) for the lifetime of that transaction. The
 * transaction client is stashed in AsyncLocalStorage so TenantPrismaService
 * can hand it to any service down the call stack without threading it
 * through every method signature.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ tenantId?: string; user?: { sub: string } }>();
    const tenantId = req.tenantId;

    if (!tenantId) {
      return next.handle();
    }

    return from(
      this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
        return tenantContextStorage.run(
          { tenantId, tx, userId: req.user?.sub },
          () => lastValueFrom(next.handle()),
        );
      }),
    );
  }
}
