import { cookies, headers } from "next/headers";

const TENANT_COOKIE = "tenant_subdomain";

/** Server-only: reads the tenant resolved by middleware.ts for this request. */
export function getTenantSubdomain(): string | null {
  return headers().get("x-tenant-subdomain") ?? cookies().get(TENANT_COOKIE)?.value ?? null;
}
