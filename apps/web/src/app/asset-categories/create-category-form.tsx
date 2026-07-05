import { createAssetCategory } from "./actions";

export function CreateCategoryForm() {
  return (
    <form
      action={createAssetCategory}
      className="flex flex-wrap items-end gap-3 rounded border border-slate-200 p-4"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Name</span>
        <input name="name" required className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Default depreciation method</span>
        <select
          name="defaultDepreciationMethod"
          required
          className="rounded border border-slate-300 px-2 py-1"
        >
          <option value="STRAIGHT_LINE">Straight-line</option>
          <option value="DECLINING_BALANCE">Declining balance</option>
          <option value="UNITS_OF_PRODUCTION">Units of production</option>
        </select>
      </label>
      <button type="submit" className="rounded bg-tenant-primary px-3 py-1.5 text-sm font-medium text-white">
        Add category
      </button>
    </form>
  );
}
