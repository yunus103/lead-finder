import { supabaseAdmin } from "@/lib/supabase";
import { CrmStatus } from "@/types/crm";

export interface DashboardData {
  pipeline: {
    total: number;
    toCall: number;
    contacted: number;
    followUps: number;
    dueFollowUpsCount: number;
    opportunities: number;
    won: number;
    lost: number;
    excluded: number;
    hotUntouchedCount: number;
  };
  dueFollowUps: Array<{
    id: string;
    name: string;
    phone: string | null;
    category: string | null;
    district: string | null;
    city: string | null;
    next_follow_up_at: string;
    lead_score: number;
    priority: string;
    crm_status: CrmStatus;
    notes: string | null;
  }>;
  hotQueueLeads: Array<{
    id: string;
    name: string;
    phone: string | null;
    category: string | null;
    district: string | null;
    lead_score: number;
    priority: string;
    crm_status: CrmStatus;
    score_reasons: Array<{ factor: string; points: number }> | null;
  }>;
  recentActivities: Array<{
    id: string;
    business_id: string;
    type: string;
    outcome: string | null;
    content: string | null;
    created_at: string;
    business_name: string;
    business_phone: string | null;
  }>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const nowIso = new Date().toISOString();

  // Fetch minimal stats columns, top due follow-ups, hot queue leads, and recent activities concurrently
  const [statsRes, dueRes, hotRes, actRes] = await Promise.all([
    // Minimal columns for pipeline metrics
    supabaseAdmin
      .from("businesses")
      .select("crm_status, is_excluded, next_follow_up_at, lead_score, contact_attempts"),

    // Urgent Due follow-ups
    supabaseAdmin
      .from("businesses")
      .select("id, name, phone, category, district, city, next_follow_up_at, lead_score, priority, crm_status, notes")
      .eq("is_excluded", false)
      .lte("next_follow_up_at", nowIso)
      .order("next_follow_up_at", { ascending: true })
      .limit(6),

    // Top HOT actionable leads waiting in queue
    supabaseAdmin
      .from("businesses")
      .select("id, name, phone, category, district, lead_score, priority, crm_status, score_reasons")
      .eq("is_excluded", false)
      .gte("lead_score", 70)
      .in("crm_status", ["NEW", "TO_CALL"])
      .order("lead_score", { ascending: false })
      .limit(6),

    // Recent calling & CRM activities
    supabaseAdmin
      .from("lead_activities")
      .select("id, business_id, type, outcome, content, created_at, businesses(name, phone)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const rows = statsRes.data || [];
  let total = rows.length;
  let toCall = 0;
  let contacted = 0;
  let followUps = 0;
  let dueFollowUpsCount = 0;
  let opportunities = 0;
  let won = 0;
  let lost = 0;
  let excluded = 0;
  let hotUntouchedCount = 0;

  for (const r of rows) {
    if (r.is_excluded) {
      excluded++;
      continue;
    }

    const status = r.crm_status as CrmStatus;
    const score = r.lead_score || 0;
    const attempts = r.contact_attempts || 0;

    if (status === "WON") won++;
    else if (status === "LOST") lost++;
    else if (status === "CONTACTED") contacted++;
    else if (status === "NEW" || status === "TO_CALL") {
      toCall++;
      if (score >= 70 && attempts === 0) {
        hotUntouchedCount++;
      }
    } else if (status === "FOLLOW_UP" || r.next_follow_up_at) {
      followUps++;
      if (r.next_follow_up_at && r.next_follow_up_at <= nowIso) {
        dueFollowUpsCount++;
      }
    } else if (
      status === "INTERESTED" ||
      status === "QUALIFIED" ||
      status === "MEETING" ||
      status === "PROPOSAL"
    ) {
      opportunities++;
    }
  }

  // Format recent activities safely
  type RawActivity = {
    id: string;
    business_id: string;
    type: string;
    outcome: string | null;
    content: string | null;
    created_at: string;
    businesses: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null;
  };

  const rawActs = (actRes.data || []) as unknown as RawActivity[];
  const formattedActivities = rawActs.map((a) => {
    const biz = Array.isArray(a.businesses) ? a.businesses[0] : a.businesses;
    return {
      id: a.id,
      business_id: a.business_id,
      type: a.type,
      outcome: a.outcome,
      content: a.content,
      created_at: a.created_at,
      business_name: biz?.name || "Bilinmeyen İşletme",
      business_phone: biz?.phone || null,
    };
  });

  return {
    pipeline: {
      total,
      toCall,
      contacted,
      followUps,
      dueFollowUpsCount,
      opportunities,
      won,
      lost,
      excluded,
      hotUntouchedCount,
    },
    dueFollowUps: (dueRes.data || []) as DashboardData["dueFollowUps"],
    hotQueueLeads: (hotRes.data || []) as DashboardData["hotQueueLeads"],
    recentActivities: formattedActivities,
  };
}
