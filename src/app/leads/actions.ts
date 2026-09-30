"use server";

import { revalidatePath } from "next/cache";
import { ingestBusiness } from "@/services/business-service";
import { IngestBusinessInput } from "@/types/business";
import { CallOutcome, CrmStatus } from "@/types/crm";
import { demoUrl, validateSlug } from "@/lib/demo-slug";

// Client components keep their own optimistic state after these actions, so they don't
// call revalidatePath: that would re-render the whole current page inside the action response.

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
    });

    revalidatePath("/leads");
    return {
      success: true,
      isNew: result.isNew,
      matchedBy: result.matchedBy,
      businessId: result.business.id,
    };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function runWebsiteAuditAction(businessId: string) {
  try {
    const { performWebsiteAudit } = await import("@/services/website-service");
    const audit = await performWebsiteAudit(businessId);
    return { success: true, audit };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error), audit: null };
  }
}

export async function runPageSpeedAction(businessId: string) {
  try {
    const { performPageSpeedAudit } = await import("@/services/website-service");
    const audit = await performPageSpeedAudit(businessId);
    return { success: true, audit };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error), audit: null };
  }
}

export async function recalculateScoreAction(businessId: string) {
  try {
    const { updateBusinessScore } = await import("@/services/scoring-service");
    const result = await updateBusinessScore(businessId);
    return { success: true, result };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function logCallAction(params: {
  businessId: string;
  outcome: CallOutcome;
  notes?: string | null;
  followUpDate?: string | null;
  customStatus?: CrmStatus;
  currentAttempts?: number;
  currentStatus?: string;
  queueFilter?: { category?: string; district?: string };
}) {
  try {
    const { logCallInteraction } = await import("@/services/crm-service");
    return await logCallInteraction(params);
  } catch (error: unknown) {
    return { success: false, nextStatus: "NEW" as const, nextLeadId: null, followUpAt: null, error: errorMessage(error) };
  }
}

export async function logWhatsAppAction(businessId: string, message: string) {
  try {
    const { logWhatsAppContact } = await import("@/services/crm-service");
    return await logWhatsAppContact(businessId, message);
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateLeadStatusAction(businessId: string, status: CrmStatus) {
  try {
    const { updateLeadStatus } = await import("@/services/crm-service");
    return await updateLeadStatus(businessId, status);
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function setLeadExclusionAction(
  businessId: string,
  isExcluded: boolean,
  reason?: string | null
) {
  try {
    const { setLeadExclusion } = await import("@/services/crm-service");
    return await setLeadExclusion(businessId, isExcluded, reason);
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function saveLeadNoteAction(businessId: string, noteText: string) {
  try {
    const { saveLeadNote } = await import("@/services/crm-service");
    return await saveLeadNote(businessId, noteText);
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
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
    return { success: false, error: errorMessage(error), nextId: null };
  }
}

export async function createDemoPromptAction(businessId: string, templateId: string, slug: string) {
  const slugError = validateSlug(slug);
  if (slugError) return { success: false, error: slugError, prompt: null, warning: null };
  try {
    const { createDemoPrompt } = await import("@/services/demo-service");
    const { prompt, warning } = await createDemoPrompt(businessId, templateId, slug);
    return { success: true, prompt, warning };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error), prompt: null, warning: null };
  }
}

export async function saveDemoAction(businessId: string, template: string, url: string) {
  // The agent may change the slug (e.g. on a collision), so the saved slug always comes from the link.
  const slug = url.trim().match(/^https:\/\/([a-z0-9-]+)\.yaytechstudio\.com\/?$/)?.[1];
  const slugError = slug ? validateSlug(slug) : "Link https://<slug>.yaytechstudio.com biçiminde olmalı.";
  if (!slug || slugError) return { success: false, error: slugError, demo: null };
  try {
    const { saveDemo } = await import("@/services/demo-service");
    const demo = await saveDemo(businessId, template, slug, demoUrl(slug));
    return { success: true, demo };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error), demo: null };
  }
}

export async function markDemoSentAction(businessId: string, url: string) {
  try {
    const { markDemoSent } = await import("@/services/demo-service");
    const sentAt = await markDemoSent(businessId, url);
    return { success: true, sentAt };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error), sentAt: null };
  }
}
