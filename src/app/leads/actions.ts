"use server";

import { revalidatePath } from "next/cache";
import { ingestBusiness } from "@/services/business-service";
import { IngestBusinessInput } from "@/types/business";

export async function ingestLeadAction(formData: FormData) {
  const name = formData.get("name") as string;
  const category = (formData.get("category") as string) || undefined;
  const phone = (formData.get("phone") as string) || undefined;
  const website = (formData.get("website") as string) || undefined;
  const instagram = (formData.get("instagram") as string) || undefined;
  const city = (formData.get("city") as string) || undefined;
  const district = (formData.get("district") as string) || undefined;
  const address = (formData.get("address") as string) || undefined;
  const external_id = (formData.get("external_id") as string) || undefined;
  const provider = (formData.get("provider") as IngestBusinessInput["provider"]) || "manual";

  if (!name || !name.trim()) {
    return { success: false, error: "Business name is required." };
  }

  try {
    const result = await ingestBusiness({
      name,
      category,
      phone,
      website,
      instagram,
      city,
      district,
      address,
      provider,
      external_id,
      rating: 4.5,
      review_count: 12,
    });

    revalidatePath("/leads");
    return {
      success: true,
      isNew: result.isNew,
      matchedBy: result.matchedBy,
      businessId: result.business.id,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function runLightweightScanAction(businessId: string) {
  try {
    const { performLightweightAudit } = await import("@/services/website-service");
    const audit = await performLightweightAudit(businessId);
    revalidatePath(`/leads/${businessId}`);
    revalidatePath("/leads");
    return { success: true, audit };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function runDeepAuditAction(businessId: string) {
  try {
    const { performDeepAudit } = await import("@/services/website-service");
    const audit = await performDeepAudit(businessId);
    revalidatePath(`/leads/${businessId}`);
    revalidatePath("/leads");
    return { success: true, audit };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function recalculateScoreAction(businessId: string) {
  try {
    const { updateBusinessScore } = await import("@/services/scoring-service");
    const result = await updateBusinessScore(businessId);
    revalidatePath(`/leads/${businessId}`);
    revalidatePath("/leads");
    return { success: true, result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function recalculateAllScoresAction() {
  try {
    const { recalculateAllScores } = await import("@/services/scoring-service");
    const { count } = await recalculateAllScores();
    revalidatePath("/leads");
    return { success: true, count };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function logCallAction(params: {
  businessId: string;
  outcome: import("@/types/crm").CallOutcome;
  notes?: string | null;
  followUpDate?: string | null;
  customStatus?: import("@/types/crm").CrmStatus;
  currentAttempts?: number;
  currentStatus?: string;
  queueFilter?: { category?: string; district?: string };
}) {
  try {
    const { logCallInteraction } = await import("@/services/crm-service");
    const res = await logCallInteraction(params);
    revalidatePath(`/leads/${params.businessId}`);
    revalidatePath("/leads");
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, nextStatus: "NEW" as const, nextLeadId: null, error: message };
  }
}

export async function updateLeadStatusAction(
  businessId: string,
  status: import("@/types/crm").CrmStatus
) {
  try {
    const { updateLeadStatus } = await import("@/services/crm-service");
    const res = await updateLeadStatus(businessId, status);
    revalidatePath(`/leads/${businessId}`);
    revalidatePath("/leads");
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function setLeadExclusionAction(
  businessId: string,
  isExcluded: boolean,
  reason?: string | null
) {
  try {
    const { setLeadExclusion } = await import("@/services/crm-service");
    const res = await setLeadExclusion(businessId, isExcluded, reason);
    revalidatePath(`/leads/${businessId}`);
    revalidatePath("/leads");
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function saveLeadNoteAction(businessId: string, noteText: string) {
  try {
    const { saveLeadNote } = await import("@/services/crm-service");
    const res = await saveLeadNote(businessId, noteText);
    revalidatePath(`/leads/${businessId}`);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function getNextLeadAction(
  currentLeadId: string,
  options?: { category?: string; district?: string }
) {
  try {
    const { getNextLeadId } = await import("@/services/crm-service");
    const nextId = await getNextLeadId(currentLeadId, options);
    return { success: true, nextId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message, nextId: null };
  }
}




