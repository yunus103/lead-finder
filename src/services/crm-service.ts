import { supabaseAdmin } from "@/lib/supabase";
import { CrmStatus, CallOutcome, LeadActivity, CRM_STATUS_CONFIG, EXCLUSION_REASONS } from "@/types/crm";
import { Business } from "@/types/business";
import { WebsiteAudit } from "@/types/website";

const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: "Cevap Yok / Meşgul",
  callback: "Geri Aranacak (Takip)",
  interested: "İlgilendi / Sıcak Fırsat",
  meeting: "Toplantı / Sunum Ayarlandı",
  proposal: "Teklif İletildi",
  rejected: "Reddedildi / İstemiyor",
  excluded: "Kayıt Dışlandı",
};

/** Unanswered calls are retried automatically until this many attempts. */
const MAX_NO_ANSWER_ATTEMPTS = 3;
const ACTIVE_QUEUE_STATUSES = ["NEW", "TO_CALL", "QUALIFIED"];

/** Next day 10:00 Turkey time (UTC+3, no DST). */
function nextMorningIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(7, 0, 0, 0);
  return d.toISOString();
}

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
}): Promise<{
  success: boolean;
  nextStatus: CrmStatus;
  nextLeadId?: string | null;
  followUpAt: string | null;
  error?: string;
}> {
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

  // 2. Every logged call resolves the pending follow-up; otherwise a due follow-up would
  // stay "due" forever and keep coming back to the top of the queue.
  let followUpAt: string | null = followUpDate ?? null;
  if (!followUpAt && outcome === "no_answer" && nextAttempts < MAX_NO_ANSWER_ATTEMPTS) {
    followUpAt = nextMorningIso();
  }

  // businesses.notes is the user's own notepad; call outcomes only go to the activity log.
  const updatePayload: Record<string, unknown> = {
    crm_status: nextStatus,
    contact_attempts: nextAttempts,
    last_contacted_at: new Date().toISOString(),
    next_follow_up_at: followUpAt,
  };

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
          follow_up_at: followUpAt,
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

  return { success: true, nextStatus, nextLeadId: results[2], followUpAt };
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

  const reasonLabel = EXCLUSION_REASONS.find((r) => r.value === reason)?.label || reason;
  try {
    await supabaseAdmin.from("lead_activities").insert({
      business_id: businessId,
      type: "status_change",
      outcome: isExcluded ? "excluded" : "restored",
      content: isExcluded
        ? `İşletme aramadan dışlandı${reasonLabel ? ` (${reasonLabel})` : ""}.`
        : "İşletme tekrar aktif listeye alındı.",
      metadata: { is_excluded: isExcluded, reason: reason || null },
    });
  } catch (actErr) {
    console.warn("Failed to record exclusion activity:", actErr);
  }

  return { success: true };
}

/**
 * Saves the lead's persistent notepad. Notes are not activity events, so nothing is
 * written to the timeline. An empty string clears the notepad.
 */
export async function saveLeadNote(
  businessId: string,
  noteText: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("businesses")
    .update({ notes: noteText.trim() || null })
    .eq("id", businessId);

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Records that a WhatsApp message was opened for sending and marks untouched leads as contacted.
 */
export async function logWhatsAppContact(
  businessId: string,
  message: string
): Promise<{ success: boolean; nextStatus?: CrmStatus; error?: string }> {
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("crm_status")
    .eq("id", businessId)
    .single();

  const currentStatus = (business?.crm_status || "NEW") as CrmStatus;
  const nextStatus: CrmStatus = ACTIVE_QUEUE_STATUSES.includes(currentStatus) ? "CONTACTED" : currentStatus;

  const [updateRes, insertRes] = await Promise.all([
    supabaseAdmin
      .from("businesses")
      .update({ crm_status: nextStatus, last_contacted_at: new Date().toISOString() })
      .eq("id", businessId),
    supabaseAdmin.from("lead_activities").insert({
      business_id: businessId,
      type: "whatsapp",
      outcome: "sent",
      content: message,
      metadata: { previous_status: currentStatus, new_status: nextStatus },
    }),
  ]);

  const error = updateRes.error || insertRes.error;
  return error ? { success: false, error: error.message } : { success: true, nextStatus };
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

type QueueFilter = { category?: string; district?: string };

/** Base query over active (non-excluded) leads with the queue's segment filters applied. */
function queueQuery(options: QueueFilter | undefined, currentLeadId?: string, countOnly = false) {
  let q = supabaseAdmin
    .from("businesses")
    .select("id", countOnly ? { count: "exact", head: true } : undefined)
    .eq("is_excluded", false);
  if (currentLeadId && isValidUuid(currentLeadId)) q = q.neq("id", currentLeadId);
  if (options?.category) q = q.eq("category", options.category);
  if (options?.district) q = q.eq("district", options.district);
  return q;
}

/**
 * Returns the next lead to call: due follow-ups first (oldest first), then fresh leads by score.
 * Leads that were already worked and have no pending follow-up are intentionally not revisited.
 */
export async function getNextLeadId(
  currentLeadId?: string,
  options?: QueueFilter
): Promise<string | null> {
  const nowIso = new Date().toISOString();

  const [followUps, fresh] = await Promise.all([
    queueQuery(options, currentLeadId)
      .lte("next_follow_up_at", nowIso)
      .not("crm_status", "in", '("WON","LOST")')
      .order("next_follow_up_at", { ascending: true })
      .limit(1),
    queueQuery(options, currentLeadId)
      .in("crm_status", ACTIVE_QUEUE_STATUSES)
      .order("lead_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  return followUps.data?.[0]?.id || fresh.data?.[0]?.id || null;
}

/**
 * Fetches the lead to be shown in the Calling Queue.
 * If leadId is passed, fetches it; otherwise retrieves the top priority lead.
 */
export async function getQueueLead(
  leadId?: string,
  options?: { category?: string; district?: string }
): Promise<{ lead: Business; audit: WebsiteAudit | null } | null> {
  const targetId = leadId && isValidUuid(leadId) ? leadId : await getNextLeadId(undefined, options);
  if (!targetId) return null;

  // Sources and the latest audit come back in the same round trip.
  const { data } = await supabaseAdmin
    .from("businesses")
    .select("*, business_sources(provider, source_url), website_audits(*)")
    .eq("id", targetId)
    .order("created_at", { referencedTable: "website_audits", ascending: false })
    .limit(1, { referencedTable: "website_audits" })
    .maybeSingle();

  if (!data) return null;

  const { business_sources, website_audits, ...lead } = data as Business & {
    business_sources: { provider: string; source_url: string | null }[] | null;
    website_audits: WebsiteAudit[] | null;
  };

  const mapsSource = business_sources?.find((s) => s.provider === "google_maps");
  const google_maps_url =
    mapsSource?.source_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lead.name} ${lead.district || ""} ${lead.city || ""}`
    )}`;

  return {
    lead: { ...lead, google_maps_url },
    audit: website_audits?.[0] || null,
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
  const nowIso = new Date().toISOString();

  // Remaining = fresh leads + due follow-ups (same definition getNextLeadId uses).
  const [freshRes, dueRes, facetRes] = await Promise.all([
    queueQuery(options, undefined, true).in("crm_status", ACTIVE_QUEUE_STATUSES),
    queueQuery(options, undefined, true)
      .not("crm_status", "in", `("WON","LOST",${ACTIVE_QUEUE_STATUSES.map((st) => `"${st}"`).join(",")})`)
      .lte("next_follow_up_at", nowIso),
    supabaseAdmin
      .from("businesses")
      .select("category, district")
      .eq("is_excluded", false)
      .not("crm_status", "in", '("WON","LOST")')
      .limit(1000),
  ]);

  const count = (freshRes.count || 0) + (dueRes.count || 0);
  const sampleData = facetRes.data;

  const categoriesSet = new Set<string>();
  const districtsSet = new Set<string>();

  (sampleData || []).forEach((item) => {
    if (item.category && item.category.trim()) categoriesSet.add(item.category.trim());
    if (item.district && item.district.trim()) districtsSet.add(item.district.trim());
  });

  return {
    remainingCount: count,
    categories: Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, "tr")),
    districts: Array.from(districtsSet).sort((a, b) => a.localeCompare(b, "tr")),
  };
}