"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";

export async function createAssetCategory(formData: FormData) {
  await apiFetch("/asset-categories", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      defaultDepreciationMethod: formData.get("defaultDepreciationMethod"),
    }),
  });
  revalidatePath("/asset-categories");
}
