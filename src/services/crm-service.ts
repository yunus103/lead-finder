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
}): Promise<{ success: boolean; nextStatus: CrmStatus; error?: string }> {
  const { businessId, outcome, notes, followUpDate, customStatus } = params;

  // 1. Fetch current lead state
  const { data: business, error: fetchErr } = await supabaseAdmin
    .from("businesses")
    .select("crm_status, contact_attempts")
    .eq("id", businessId)
    .single();

  if (fetchErr || !business) {
    return { success: false, nextStatus: "NEW", error: fetchErr?.message || "İşletme bulunamadı." };
  }

  const currentAttempts = (business.contact_attempts || 0) + 1;
  let nextStatus: CrmStatus = customStatus || (business.crm_status as CrmStatus) || "NEW";

  if (!customStatus) {
    switch (outcome) {
      case "no_answer":
        if (business.crm_status === "NEW" || business.crm_status === "TO_CALL") {
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

  // 2. Update businesses table with fallback resilience
  const updatePayload: Record<string, unknown> = {
    crm_status: nextStatus,
    contact_attempts: currentAttempts,
    last_contacted_at: new Date().toISOString(),
  };

  if (followUpDate !== undefined) {
    updatePayload.next_follow_up_at = followUpDate;
  }
  if (notes) {
    updatePayload.notes = notes;
  }

  const { error: updateErr } = await supabaseAdmin
    .from("businesses")
    .update(updatePayload)
    .eq("id", businessId);

  if (updateErr) {
    console.warn("Full CRM update failed, attempting fallback:", updateErr.message);
    await supabaseAdmin
      .from("businesses")
      .update({ crm_status: nextStatus })
      .eq("id", businessId);
  }

  // 3. Record in lead_activities
  try {
    const activityContent = notes
      ? notes.trim()
      : `${CALL_OUTCOME_LABELS[outcome] || outcome} olarak kaydedildi.`;

    await supabaseAdmin.from("lead_activities").insert({
      business_id: businessId,
      type: "call",
      outcome,
      content: activityContent,
      metadata: {
        previous_status: business.crm_status,
        new_status: nextStatus,
        contact_attempt: currentAttempts,
        follow_up_at: followUpDate || null,
      },
    });
  } catch (actErr) {
    console.warn("Failed to record lead activity (migration may be pending):", actErr);
  }

  return { success: true, nextStatus };
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

/**
 * Returns the ID of the next highest-priority candidate lead for continuous calling.
 */
export async function getNextLeadId(currentLeadId: string): Promise<string | null> {
  const nowIso = new Date().toISOString();

  // 1. Check if any follow-ups are due
  const { data: followUps } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("is_excluded", false)
    .neq("id", currentLeadId)
    .lte("next_follow_up_at", nowIso)
    .order("next_follow_up_at", { ascending: true })
    .limit(1);

  if (followUps && followUps.length > 0) {
    return followUps[0].id;
  }

  // 2. Otherwise get next highest scoring lead that is in NEW, TO_CALL, or QUALIFIED
  const { data: nextLeads } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("is_excluded", false)
    .neq("id", currentLeadId)
    .in("crm_status", ["NEW", "TO_CALL", "QUALIFIED"])
    .order("lead_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (nextLeads && nextLeads.length > 0) {
    return nextLeads[0].id;
  }

  // 3. Fallback to any non-excluded lead not in LOST or WON
  const { data: anyLead } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("is_excluded", false)
    .neq("id", currentLeadId)
    .neq("crm_status", "LOST")
    .neq("crm_status", "WON")
    .order("lead_score", { ascending: false })
    .limit(1);

  return anyLead && anyLead.length > 0 ? anyLead[0].id : null;
}