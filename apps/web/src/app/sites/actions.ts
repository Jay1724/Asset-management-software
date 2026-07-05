"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";

export async function createSite(formData: FormData) {
  await apiFetch("/sites", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      location: formData.get("location") || undefined,
      timezone: formData.get("timezone") || undefined,
    }),
  });
  revalidatePath("/sites");
}
