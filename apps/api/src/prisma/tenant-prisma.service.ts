import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getTenantContext } from "../common/tenant-context";

/**
 * Every method call is proxied into the current request's transaction
 * (see TenantScopeInterceptor), which has `app.current_tenant_id` set for
 * the lifetime of that transaction. Postgres RLS policies enforce the
 * actual isolation — this class only ever hands out that scoped client.
 */
@Injectable()
export class TenantPrismaService {
  get db(): Prisma.TransactionClient {
    return getTenantContext().tx;
  }

  get tenantId(): string {
    return getTenantContext().tenantId;
  }
}
