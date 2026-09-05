"use server";

import { revalidatePath } from "next/cache";
import { executeDiscovery, saveSelectedCandidateLeads } from "@/services/discovery/orchestrator";
import { DiscoveredCandidateLead } from "@/services/discovery/types";
import { DiscoveryProvider } from "@/types/business";

export async function runDiscoveryAction(formData: FormData) {
  const location = formData.get("location") as string;
  const district = (formData.get("district") as string) || undefined;
  const sector = formData.get("sector") as string;

  const sources: DiscoveryProvider[] = [];
  if (formData.get("source_maps")) sources.push("google_maps");
  if (formData.get("source_search")) sources.push("google_search");
  if (formData.get("source_instagram")) sources.push("instagram");

  const limitStr = formData.get("limit") as string;
  const limit = limitStr ? parseInt(limitStr, 10) : 20;

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
      limit,
    });

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

export async function saveSelectedLeadsAction(leads: DiscoveredCandidateLead[]) {
  if (!leads || leads.length === 0) {
    return { success: false, error: "Kaydedilecek işletme seçilmedi." };
  }

  try {
    const result = await saveSelectedCandidateLeads(leads);
    revalidatePath("/leads");
    revalidatePath("/discover");
    return { success: true, savedCount: result.savedCount, savedIds: result.savedIds };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function deleteBusinessAction(businessId: string) {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    await supabaseAdmin.from("businesses").delete().eq("id", businessId);
    revalidatePath("/leads");
    revalidatePath("/discover");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function loadPastSearchAction(searchId: string) {
  try {
    const { getSearchWithCandidateResults } = await import("@/services/discovery/orchestrator");
    const result = await getSearchWithCandidateResults(searchId);
    if (!result) {
      return { success: false, error: "Arama kaydı bulunamadı." };
    }
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

