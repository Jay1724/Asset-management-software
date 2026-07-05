import { cookies } from "next/headers";
import { getTenantSubdomain } from "./tenant";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
export const SESSION_COOKIE = "session_token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Server-only fetch wrapper: attaches tenant + auth context to every API call. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const subdomain = getTenantSubdomain();
  const token = cookies().get(SESSION_COOKIE)?.value;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (subdomain) headers.set("X-Tenant-Subdomain", subdomain);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
