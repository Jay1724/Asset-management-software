"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function Nav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="mb-6 flex items-center gap-4 text-sm">
      <Link href="/assets" className="font-medium text-slate-700 hover:text-tenant-primary">
        Assets
      </Link>
      <Link href="/sites" className="font-medium text-slate-700 hover:text-tenant-primary">
        Sites
      </Link>
      <Link href="/asset-categories" className="font-medium text-slate-700 hover:text-tenant-primary">
        Categories
      </Link>
      <button onClick={logout} className="ml-auto text-slate-500 hover:text-slate-800">
        Sign out
      </button>
    </nav>
  );
}
