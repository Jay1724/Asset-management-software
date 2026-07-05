import { NextRequest, NextResponse } from "next/server";

const TENANT_COOKIE = "tenant_subdomain";

/**
 * Resolves which tenant a request belongs to and stashes it in a cookie
 * so both server components and the API proxy route handlers can read it.
 *
 * In production, tenants get real subdomains (acme.miningplatform.com) so
 * the Host header alone resolves the tenant. Locally there's no DNS for
 * subdomains, so visiting `/?tenant=demo` once persists the choice in a
 * cookie for the rest of the session.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const queryTenant = url.searchParams.get("tenant");

  let subdomain = queryTenant ?? request.cookies.get(TENANT_COOKIE)?.value ?? null;

  if (!subdomain) {
    const host = request.headers.get("host") ?? "";
    const parts = host.split(".");
    if (parts.length >= 3) {
      subdomain = parts[0];
    }
  }

  const response = queryTenant
    ? NextResponse.redirect(stripTenantParam(url))
    : NextResponse.next();

  if (subdomain) {
    response.cookies.set(TENANT_COOKIE, subdomain, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
    response.headers.set("x-tenant-subdomain", subdomain);
  }

  return response;
}

function stripTenantParam(url: URL) {
  const next = new URL(url);
  next.searchParams.delete("tenant");
  return next;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
