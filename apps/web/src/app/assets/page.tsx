import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Nav } from "@/components/nav";
import { Asset, AssetCategory, Site } from "@/lib/types";
import { CreateAssetForm } from "./create-asset-form";

export default async function AssetsPage() {
  let assets: Asset[];
  let sites: Site[];
  let categories: AssetCategory[];
  try {
    [assets, sites, categories] = await Promise.all([
      apiFetch<Asset[]>("/assets"),
      apiFetch<Site[]>("/sites"),
      apiFetch<AssetCategory[]>("/asset-categories"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login");
    throw err;
  }

  return (
    <div>
      <Nav />
      <h1 className="mb-4 text-2xl font-semibold">Assets</h1>
      {sites.length === 0 || categories.length === 0 ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Create at least one site and category before adding assets.
        </p>
      ) : (
        <CreateAssetForm sites={sites} categories={categories} />
      )}
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2">Name</th>
            <th className="py-2">Site</th>
            <th className="py-2">Category</th>
            <th className="py-2">Method</th>
            <th className="py-2">Current value</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} className="border-b border-slate-100">
              <td className="py-2">
                <Link href={`/assets/${asset.id}`} className="font-medium text-tenant-primary hover:underline">
                  {asset.name}
                </Link>
                <div className="text-xs text-slate-400">{asset.serialNo}</div>
              </td>
              <td className="py-2">{asset.site?.name}</td>
              <td className="py-2">{asset.category?.name}</td>
              <td className="py-2">{asset.depreciationMethod}</td>
              <td className="py-2">${Number(asset.currentValue).toLocaleString()}</td>
              <td className="py-2">{asset.status}</td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-slate-400">
                No assets yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
