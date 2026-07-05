import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Nav } from "@/components/nav";
import { Asset, ValuationEvent } from "@/lib/types";
import { addValuationEvent, recalculateDepreciation, updateUsage } from "../actions";

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  let asset: Asset;
  let events: ValuationEvent[];
  try {
    [asset, events] = await Promise.all([
      apiFetch<Asset>(`/assets/${params.id}`),
      apiFetch<ValuationEvent[]>(`/assets/${params.id}/valuation-events`),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login");
    throw err;
  }

  const recalc = recalculateDepreciation.bind(null, asset.id);
  const updateUsageForAsset = updateUsage.bind(null, asset.id);
  const addEventForAsset = addValuationEvent.bind(null, asset.id);
  const schedule = asset.depreciationSchedule;

  return (
    <div>
      <Nav />
      <h1 className="text-2xl font-semibold">{asset.name}</h1>
      <p className="mb-6 text-sm text-slate-500">
        {asset.serialNo} · {asset.site?.name} · {asset.category?.name}
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Purchase value" value={`$${Number(asset.purchaseValue).toLocaleString()}`} />
        <Stat label="Current value" value={`$${Number(asset.currentValue).toLocaleString()}`} highlight />
        <Stat label="Method" value={asset.depreciationMethod} />
        <Stat label="Status" value={asset.status} />
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-medium">Depreciation</h2>
        {schedule ? (
          <div className="flex flex-wrap items-end gap-4 rounded border border-slate-200 p-4">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <dt className="text-slate-500">Salvage value</dt>
              <dd>${Number(schedule.salvageValue).toLocaleString()}</dd>
              {schedule.usefulLifeYears != null && (
                <>
                  <dt className="text-slate-500">Useful life</dt>
                  <dd>{schedule.usefulLifeYears} years</dd>
                </>
              )}
              {schedule.totalExpectedUnits != null && (
                <>
                  <dt className="text-slate-500">Total expected units</dt>
                  <dd>{Number(schedule.totalExpectedUnits).toLocaleString()}</dd>
                  <dt className="text-slate-500">Units used to date</dt>
                  <dd>{Number(schedule.unitsUsedToDate).toLocaleString()}</dd>
                </>
              )}
              <dt className="text-slate-500">Last run</dt>
              <dd>{schedule.lastRunDate ? new Date(schedule.lastRunDate).toLocaleString() : "Never"}</dd>
            </dl>

            <form action={recalc}>
              <button type="submit" className="rounded bg-tenant-primary px-3 py-1.5 text-sm font-medium text-white">
                Recalculate now
              </button>
            </form>

            {asset.depreciationMethod === "UNITS_OF_PRODUCTION" && (
              <form action={updateUsageForAsset} className="flex items-end gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">Units used to date</span>
                  <input
                    type="number"
                    name="unitsUsedToDate"
                    step="0.01"
                    defaultValue={schedule.unitsUsedToDate}
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
                <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium">
                  Update usage
                </button>
              </form>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No depreciation schedule configured.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-medium">Manual valuation event</h2>
        <p className="mb-2 text-xs text-slate-400">
          For appreciation (land, mineral rights) or one-off adjustments. Always logged, never silent.
        </p>
        <form action={addEventForAsset} className="flex flex-wrap items-end gap-3 rounded border border-slate-200 p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Type</span>
            <select name="type" className="rounded border border-slate-300 px-2 py-1">
              <option value="APPRECIATION">Appreciation</option>
              <option value="MANUAL_ADJUSTMENT">Manual adjustment</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Amount (signed)</span>
            <input type="number" name="amount" step="0.01" required className="rounded border border-slate-300 px-2 py-1" />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Note</span>
            <input name="note" className="rounded border border-slate-300 px-2 py-1" />
          </label>
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium">
            Log event
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-medium">Valuation history</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Date</th>
              <th className="py-2">Type</th>
              <th className="py-2">Source</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Resulting value</th>
              <th className="py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-slate-100">
                <td className="py-2">{new Date(event.createdAt).toLocaleString()}</td>
                <td className="py-2">{event.type}</td>
                <td className="py-2">{event.source}</td>
                <td className="py-2">{Number(event.amount).toLocaleString()}</td>
                <td className="py-2">${Number(event.resultingValue).toLocaleString()}</td>
                <td className="py-2">{event.note ?? "—"}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-slate-400">
                  No valuation events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={highlight ? "text-lg font-semibold text-tenant-primary" : "text-lg font-semibold"}>
        {value}
      </div>
    </div>
  );
}
