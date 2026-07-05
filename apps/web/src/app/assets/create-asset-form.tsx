import { Site, AssetCategory } from "@/lib/types";
import { createAsset } from "./actions";

export function CreateAssetForm({ sites, categories }: { sites: Site[]; categories: AssetCategory[] }) {
  return (
    <form action={createAsset} className="grid grid-cols-2 gap-3 rounded border border-slate-200 p-4 md:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Name</span>
        <input name="name" required className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Serial #</span>
        <input name="serialNo" required className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Site</span>
        <select name="siteId" required className="rounded border border-slate-300 px-2 py-1">
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Category</span>
        <select name="categoryId" required className="rounded border border-slate-300 px-2 py-1">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Purchase date</span>
        <input type="date" name="purchaseDate" required className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Purchase value (R)</span>
        <input type="number" name="purchaseValue" step="0.01" required className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Depreciation method</span>
        <select name="depreciationMethod" required className="rounded border border-slate-300 px-2 py-1">
          <option value="STRAIGHT_LINE">Straight-line</option>
          <option value="DECLINING_BALANCE">Declining balance</option>
          <option value="UNITS_OF_PRODUCTION">Units of production</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Unit of measure</span>
        <select name="unitOfMeasure" className="rounded border border-slate-300 px-2 py-1">
          <option value="CALENDAR">Calendar</option>
          <option value="HOURS">Hours</option>
          <option value="TONNAGE">Tonnage</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Salvage value (R)</span>
        <input type="number" name="salvageValue" step="0.01" className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Useful life (years)</span>
        <input type="number" name="usefulLifeYears" className="rounded border border-slate-300 px-2 py-1" />
        <span className="text-xs text-slate-400">Straight-line / declining balance</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Total expected units</span>
        <input type="number" name="totalExpectedUnits" className="rounded border border-slate-300 px-2 py-1" />
        <span className="text-xs text-slate-400">Units of production</span>
      </label>
      <div className="col-span-full">
        <button type="submit" className="rounded bg-tenant-primary px-3 py-1.5 text-sm font-medium text-white">
          Add asset
        </button>
      </div>
    </form>
  );
}
