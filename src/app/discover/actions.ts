"use server";

import { revalidatePath } from "next/cache";
import { executeDiscovery } from "@/services/discovery/orchestrator";
import { DiscoveryProvider } from "@/types/business";

export async function runDiscoveryAction(formData: FormData) {
  const location = formData.get("location") as string;
  const district = (formData.get("district") as string) || undefined;
  const sector = formData.get("sector") as string;

  const sources: DiscoveryProvider[] = [];
  if (formData.get("source_maps")) sources.push("google_maps");
  if (formData.get("source_search")) sources.push("google_search");
  if (formData.get("source_instagram")) sources.push("instagram");

  if (!location || !location.trim()) {
    return { success: false, error: "Lütfen bir şehir / konum belirtin." };
  }
  if (!sector || !sector.trim()) {
    return { success: false, error: "Lütfen bir sektör / kategori belirtin." };
  }
  if (sources.length === 0) {
    sources.push("google_maps");
  }

  try {
    const result = await executeDiscovery({
      location: location.trim(),
      district: district?.trim(),
      sector: sector.trim(),
      sources,
    });

    revalidatePath("/leads");
    revalidatePath("/discover");

    return {
      success: true,
      search: result.search,
      items: result.items,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
