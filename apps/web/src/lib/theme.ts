import { TenantTheme } from "@mining/shared";
import { apiFetch } from "./api";

const FALLBACK_THEME: TenantTheme = {
  subdomain: "",
  name: "Mining Asset Platform",
  logoUrl: null,
  primaryColor: "#0f172a",
  secondaryColor: "#2563eb",
  fontFamily: "Inter, sans-serif",
};

/** Falls back to neutral branding if the tenant can't be resolved yet (e.g. no subdomain cookie set). */
export async function getTenantTheme(): Promise<TenantTheme> {
  try {
    return await apiFetch<TenantTheme>("/tenant/theme");
  } catch {
    return FALLBACK_THEME;
  }
}
