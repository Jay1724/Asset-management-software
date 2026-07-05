import { AsyncLocalStorage } from "async_hooks";
import { Prisma } from "@prisma/client";

export interface TenantContext {
  tenantId: string;
  tx: Prisma.TransactionClient;
  userId?: string;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext {
  const store = tenantContextStorage.getStore();
  if (!store) {
    throw new Error(
      "No tenant context available — this code path ran outside TenantScopeInterceptor.",
    );
  }
  return store;
}
