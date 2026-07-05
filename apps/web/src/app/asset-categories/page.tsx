import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Nav } from "@/components/nav";
import { AssetCategory } from "@/lib/types";
import { CreateCategoryForm } from "./create-category-form";

export default async function AssetCategoriesPage() {
  let categories: AssetCategory[];
  try {
    categories = await apiFetch<AssetCategory[]>("/asset-categories");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login");
    throw err;
  }

  return (
    <div>
      <Nav />
      <h1 className="mb-4 text-2xl font-semibold">Asset Categories</h1>
      <CreateCategoryForm />
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2">Name</th>
            <th className="py-2">Default depreciation method</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-slate-100">
              <td className="py-2">{category.name}</td>
              <td className="py-2">{category.defaultDepreciationMethod}</td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td colSpan={2} className="py-4 text-slate-400">
                No categories yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
