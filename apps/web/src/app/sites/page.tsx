import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Nav } from "@/components/nav";
import { Site } from "@/lib/types";
import { CreateSiteForm } from "./create-site-form";

export default async function SitesPage() {
  let sites: Site[];
  try {
    sites = await apiFetch<Site[]>("/sites");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login");
    throw err;
  }

  return (
    <div>
      <Nav />
      <h1 className="mb-4 text-2xl font-semibold">Sites</h1>
      <CreateSiteForm />
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2">Name</th>
            <th className="py-2">Location</th>
            <th className="py-2">Timezone</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site.id} className="border-b border-slate-100">
              <td className="py-2">{site.name}</td>
              <td className="py-2">{site.location ?? "—"}</td>
              <td className="py-2">{site.timezone}</td>
            </tr>
          ))}
          {sites.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-slate-400">
                No sites yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
