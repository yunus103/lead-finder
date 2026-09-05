import { supabaseAdmin } from "@/lib/supabase";
import { CrmStatus, CallOutcome, LeadActivity, CRM_STATUS_CONFIG } from "@/types/crm";

const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: "Cevap Yok / Meşgul",
  callback: "Geri Aranacak (Takip)",
  interested: "İlgilendi / Sıcak Fırsat",
  meeting: "Toplantı / Sunum Ayarlandı",
  proposal: "Teklif İletildi",
  rejected: "Reddedildi / İstemiyor",
  excluded: "Kayıt Dışlandı",
};

/**
 * Logs a phone call interaction, advances CRM status, increments attempts,
 * timestamps last contact, optionally sets follow-up date, and records activity.
 */
export async function logCallInteraction(params: {
  businessId: string;
  outcome: CallOutcome;
  notes?: string | null;
  followUpDate?: string | null;
  customStatus?: CrmStatus;
  currentAttempts?: number;
  currentStatus?: string;
  queueFilter?: { category?: string; district?: string };
}): Promise<{ success: boolean; nextStatus: CrmStatus; nextLeadId?: string | null; error?: string }> {
  const { businessId, outcome, notes, followUpDate, customStatus, queueFilter } = params;

  let currentAttempts = params.currentAttempts;
  let currentCrmStatus = params.currentStatus;

  // 1. Fetch current lead state ONLY if not passed by caller
  if (currentAttempts === undefined || !currentCrmStatus) {
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("crm_status, contact_attempts")
      .eq("id", businessId)
      .single();

    if (business) {
      currentAttempts = business.contact_attempts || 0;
      currentCrmStatus = business.crm_status || "NEW";
    } else {
      currentAttempts = 0;
      currentCrmStatus = "NEW";
    }
  }

  const nextAttempts = (currentAttempts || 0) + 1;
  let nextStatus: CrmStatus = customStatus || (currentCrmStatus as CrmStatus) || "NEW";

  if (!customStatus) {
    switch (outcome) {
      case "no_answer":
        if (currentCrmStatus === "NEW" || currentCrmStatus === "TO_CALL") {
          nextStatus = "CONTACTED";
        }
        break;
      case "callback":
        nextStatus = "FOLLOW_UP";
        break;
      case "interested":
        nextStatus = "INTERESTED";
        break;
      case "meeting":
        nextStatus = "MEETING";
        break;
      case "proposal":
        nextStatus = "PROPOSAL";
        break;
      case "rejected":
        nextStatus = "LOST";
        break;
      default:
        break;
    }
  }

  // 2. Prepare payload
  const updatePayload: Record<string, unknown> = {
    crm_status: nextStatus,
    contact_attempts: nextAttempts,
    last_contacted_at: new Date().toISOString(),
  };

  if (followUpDate !== undefined) {
    updatePayload.next_follow_up_at = followUpDate;
  }
  if (notes) {
    updatePayload.notes = notes;
  }

  const activityContent = notes
    ? notes.trim()
    : `${CALL_OUTCOME_LABELS[outcome] || outcome} olarak kaydedildi.`;

  // 3. Execute DB updates and next-lead lookup concurrently
  const updatePromise = (async () => {
    const { error } = await supabaseAdmin
      .from("businesses")
      .update(updatePayload)
      .eq("id", businessId);

    if (error) {
      await supabaseAdmin
        .from("businesses")
        .update({ crm_status: nextStatus })
        .eq("id", businessId);
    }
  })();

  const insertPromise = (async () => {
    try {
      await supabaseAdmin.from("lead_activities").insert({
        business_id: businessId,
        type: "call",
        outcome,
        content: activityContent,
        metadata: {
          previous_status: currentCrmStatus,
          new_status: nextStatus,
          contact_attempt: nextAttempts,
          follow_up_at: followUpDate || null,
        },
      });
    } catch (err: unknown) {
      console.warn("Activity insert warning:", err);
    }
  })();

  const nextLeadPromise = queueFilter !== undefined
    ? getNextLeadId(businessId, queueFilter)
    : Promise.resolve(null);

  const results = await Promise.all([
    updatePromise,
    insertPromise,
    nextLeadPromise,
  ]);

  return { success: true, nextStatus, nextLeadId: results[2] };
}

/**
 * Updates CRM status explicitly and records an activity item.
 */
export async function updateLeadStatus(
  businessId: string,
  newStatus: CrmStatus
): Promise<{ success: boolean; error?: string }> {
  const { data: current } = await supabaseAdmin
    .from("businesses")
    .select("crm_status")
    .eq("id", businessId)
    .single();

  const prevStatus = current?.crm_status || "NEW";

  const { error } = await supabaseAdmin
    .from("businesses")
    .update({ crm_status: newStatus })
    .eq("id", businessId);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    const statusLabel = CRM_STATUS_CONFIG[newStatus]?.label || newStatus;
    await supabaseAdmin.from("lead_activities").insert({
      business_id: businessId,
      type: "status_change",
      outcome: newStatus,
      content: `Durum güncellendi: ${statusLabel}`,
      metadata: { previous_status: prevStatus, new_status: newStatus },
    });
  } catch (actErr) {
    console.warn("Failed to record status change activity:", actErr);
  }

  return { success: true };
}

/**
 * Marks a lead as excluded/suppressed from active calling workflows, with an optional reason.
 */
export async function setLeadExclusion(
  businessId: string,
  isExcluded: boolean,
  reason?: string | null
): Promise<{ success: boolean; error?: string }> {
  const payload: Record<string, unknown> = {
    is_excluded: isExcluded,
  };
  if (reason !== undefined) {
    payload.exclusion_reason = reason;
  }

  const { error } = await supabaseAdmin
    .from("businesses")
    .update(payload)
    .eq("id", businessId);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    await supabaseAdmin.from("lead_activities").insert({
      business_id: businessId,
      type: "status_change",
      outcome: isExcluded ? "excluded" : "restored",
      content: isExcluded
        ? `İşletme aramadan dışlandı${reason ? ` (${reason})` : ""}.`
        : "İşletme tekrar aktif listeye alındı.",
      metadata: { is_excluded: isExcluded, reason: reason || null },
    });
  } catch (actErr) {
    console.warn("Failed to record exclusion activity:", actErr);
  }

  return { success: true };
}

/**
 * Saves a text note for a lead and appends it to the activity history.
 */
export async function saveLeadNote(
  businessId: string,
  noteText: string
): Promise<{ success: boolean; error?: string }> {
  if (!noteText || !noteText.trim()) {
    return { success: false, error: "Not içeriği boş olamaz." };
  }

  try {
    await supabaseAdmin
      .from("businesses")
      .update({ notes: noteText.trim() })
      .eq("id", businessId);
  } catch (err) {
    console.warn("Failed to update business notes field:", err);
  }

  try {
    const { error } = await supabaseAdmin.from("lead_activities").insert({
      business_id: businessId,
      type: "note",
      content: noteText.trim(),
    });

    if (error) {
      return { success: false, error: error.message };
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Not kaydedilemedi.",
    };
  }

  return { success: true };
}

/**
 * Retrieves chronological activities for a business.
 */
export async function getLeadActivities(businessId: string): Promise<LeadActivity[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("lead_activities")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("lead_activities query error:", error.message);
      return [];
    }

    return (data || []) as LeadActivity[];
  } catch (e) {
    console.warn("Could not query lead_activities:", e);
    return [];
  }
}

const isValidUuid = (val?: string): boolean =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

/**
 * Returns the ID of the next highest-priority candidate lead for continuous calling.
 * Supports optional category and district segmentation.
 */
export async function getNextLeadId(
  currentLeadId?: string,
  options?: { category?: string; district?: string }
): Promise<string | null> {
  const nowIso = new Date().toISOString();
  const hasCurrentId = isValidUuid(currentLeadId);

  // 1. Check if any follow-ups are due
  let followUpQuery = supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("is_excluded", false)
    .lte("next_follow_up_at", nowIso);

  if (hasCurrentId && currentLeadId) {
    followUpQuery = followUpQuery.neq("id", currentLeadId);
  }
  if (options?.category) {
    followUpQuery = followUpQuery.eq("category", options.category);
  }
  if (options?.district) {
    followUpQuery = followUpQuery.eq("district", options.district);
  }

  const { data: followUps } = await followUpQuery
    .order("next_follow_up_at", { ascending: true })
    .limit(1);

  if (followUps && followUps.length > 0) {
    return followUps[0].id;
  }

  // 2. Next highest scoring lead in actionable status
  let nextQuery = supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("is_excluded", false)
    .in("crm_status", ["NEW", "TO_CALL", "QUALIFIED"]);

  if (hasCurrentId && currentLeadId) {
    nextQuery = nextQuery.neq("id", currentLeadId);
  }
  if (options?.category) {
    nextQuery = nextQuery.eq("category", options.category);
  }
  if (options?.district) {
    nextQuery = nextQuery.eq("district", options.district);
  }

  const { data: nextLeads } = await nextQuery
    .order("lead_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (nextLeads && nextLeads.length > 0) {
    return nextLeads[0].id;
  }

  // 3. Fallback to any non-excluded lead not in LOST or WON
  let fallbackQuery = supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("is_excluded", false)
    .neq("crm_status", "LOST")
    .neq("crm_status", "WON");

  if (hasCurrentId && currentLeadId) {
    fallbackQuery = fallbackQuery.neq("id", currentLeadId);
  }
  if (options?.category) {
    fallbackQuery = fallbackQuery.eq("category", options.category);
  }
  if (options?.district) {
    fallbackQuery = fallbackQuery.eq("district", options.district);
  }

  const { data: anyLead } = await fallbackQuery
    .order("lead_score", { ascending: false })
    .limit(1);

  return anyLead && anyLead.length > 0 ? anyLead[0].id : null;
}

/**
 * Fetches the lead to be shown in the Calling Queue.
 * If leadId is passed, fetches it; otherwise retrieves the top priority lead.
 */
export async function getQueueLead(
  leadId?: string,
  options?: { category?: string; district?: string }
): Promise<import("@/types/business").Business | null> {
  const targetId = leadId && isValidUuid(leadId) ? leadId : await getNextLeadId(undefined, options);
  if (!targetId) return null;

  const { data: lead } = await supabaseAdmin
    .from("businesses")
    .select("*, business_sources(provider, source_url)")
    .eq("id", targetId)
    .single();

  if (!lead) return null;

  const sources = (lead as unknown as { business_sources?: { provider: string; source_url: string | null }[] }).business_sources;
  const mapsSource = sources?.find((s) => s.provider === "google_maps");
  const google_maps_url =
    mapsSource?.source_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lead.name} ${lead.district || ""} ${lead.city || ""}`
    )}`;

  return {
    ...lead,
    google_maps_url,
  };
}

/**
 * Returns queue counts and available filter facets (categories, districts)
 * for active candidates.
 */
export async function getQueueMeta(options?: {
  category?: string;
  district?: string;
}): Promise<{ remainingCount: number; categories: string[]; districts: string[] }> {
  // Count remaining actionable leads in the queue
  let countQuery = supabaseAdmin
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("is_excluded", false)
    .not("crm_status", "in", '("WON","LOST")');

  if (options?.category) {
    countQuery = countQuery.eq("category", options.category);
  }
  if (options?.district) {
    countQuery = countQuery.eq("district", options.district);
  }

  const { count } = await countQuery;

  // Retrieve distinct categories and districts for dropdown filters
  const { data: sampleData } = await supabaseAdmin
    .from("businesses")
    .select("category, district")
    .eq("is_excluded", false)
    .not("crm_status", "in", '("WON","LOST")')
    .limit(300);

  const categoriesSet = new Set<string>();
  const districtsSet = new Set<string>();

  (sampleData || []).forEach((item) => {
    if (item.category && item.category.trim()) categoriesSet.add(item.category.trim());
    if (item.district && item.district.trim()) districtsSet.add(item.district.trim());
  });

  return {
    remainingCount: count || 0,
    categories: Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, "tr")),
    districts: Array.from(districtsSet).sort((a, b) => a.localeCompare(b, "tr")),
  };
}