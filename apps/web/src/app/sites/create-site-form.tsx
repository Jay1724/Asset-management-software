import { createSite } from "./actions";

export function CreateSiteForm() {
  return (
    <form action={createSite} className="flex flex-wrap items-end gap-3 rounded border border-slate-200 p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Name</span>
        <input name="name" required className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Location</span>
        <input name="location" className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Timezone</span>
        <input name="timezone" placeholder="UTC" className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <button type="submit" className="rounded bg-tenant-primary px-3 py-1.5 text-sm font-medium text-white">
        Add site
      </button>
    </form>
  );
}
