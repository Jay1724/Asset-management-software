import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/api";
import { getTenantSubdomain } from "@/lib/tenant";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const subdomain = getTenantSubdomain();

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(subdomain ? { "X-Tenant-Subdomain": subdomain } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  cookies().set(SESSION_COOKIE, data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return NextResponse.json({ user: data.user });
}
