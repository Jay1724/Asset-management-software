"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";

function numOrUndefined(value: FormDataEntryValue | null) {
  if (!value || value === "") return undefined;
  return Number(value);
}

export async function createAsset(formData: FormData) {
  await apiFetch("/assets", {
    method: "POST",
    body: JSON.stringify({
      siteId: formData.get("siteId"),
      categoryId: formData.get("categoryId"),
      name: formData.get("name"),
      serialNo: formData.get("serialNo"),
      purchaseDate: formData.get("purchaseDate"),
      purchaseValue: numOrUndefined(formData.get("purchaseValue")),
      depreciationMethod: formData.get("depreciationMethod"),
      unitOfMeasure: formData.get("unitOfMeasure") || undefined,
      salvageValue: numOrUndefined(formData.get("salvageValue")),
      usefulLifeYears: numOrUndefined(formData.get("usefulLifeYears")),
      totalExpectedUnits: numOrUndefined(formData.get("totalExpectedUnits")),
    }),
  });
  revalidatePath("/assets");
}

export async function recalculateDepreciation(assetId: string) {
  await apiFetch(`/assets/${assetId}/depreciation/recalculate`, { method: "POST" });
  revalidatePath(`/assets/${assetId}`);
}

export async function updateUsage(assetId: string, formData: FormData) {
  await apiFetch(`/assets/${assetId}/usage`, {
    method: "PATCH",
    body: JSON.stringify({ unitsUsedToDate: numOrUndefined(formData.get("unitsUsedToDate")) }),
  });
  revalidatePath(`/assets/${assetId}`);
}

export async function addValuationEvent(assetId: string, formData: FormData) {
  await apiFetch(`/assets/${assetId}/valuation-events`, {
    method: "POST",
    body: JSON.stringify({
      type: formData.get("type"),
      amount: numOrUndefined(formData.get("amount")),
      note: formData.get("note") || undefined,
    }),
  });
  revalidatePath(`/assets/${assetId}`);
}
