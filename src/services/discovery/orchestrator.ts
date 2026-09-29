import { supabaseAdmin } from "@/lib/supabase";
import { DiscoveryProvider } from "@/types/business";
import { scanWebsite } from "@/services/website/scanner";
import { calculateLeadScore } from "@/services/scoring/lead-scorer";
import { mapWithConcurrency } from "@/lib/concurrency";
import { classifyWebPresence } from "@/lib/web-presence";
import { AuditFields, scanToAuditFields, websiteStatusFromHealth } from "@/lib/site-analysis";
import { getPhoneInfo } from "@/lib/outreach";
import {
  normalizeDomain,
  normalizeInstagram,
  normalizeName,
  normalizePhone,
} from "@/lib/normalization";
import {
  DiscoveredCandidateLead,
  DiscoveryPreviewResult,
  DiscoveryQuery,
  IDiscoveryProvider,
  RawDiscoveredLead,
  SearchRecord,
} from "./types";
import { MockDiscoveryProvider } from "./providers/mock-provider";
import { GoogleMapsProvider } from "./providers/google-maps-provider";

const SCAN_CONCURRENCY = 10;

const providerRegistry = new Map<DiscoveryProvider, IDiscoveryProvider>();

export function registerProvider(provider: IDiscoveryProvider) {
  providerRegistry.set(provider.name, provider);
}

registerProvider(new GoogleMapsProvider());
registerProvider(new MockDiscoveryProvider("google_search"));
registerProvider(new MockDiscoveryProvider("instagram"));
registerProvider(new MockDiscoveryProvider("manual"));

export const EXCLUDED_INSTITUTION_KEYWORDS = [
  "devlet",
  "üniversite",
  "fakülte",
  "araştırma hastanesi",
  "şehir hastanesi",
  "sağlık ocağı",
  "aile sağlığı",
  "kamu",
  "belediye",
  "müdürlüğü",
];

export function isExcludedInstitution(name: string): boolean {
  if (!name) return false;
  const lower = name.toLocaleLowerCase("tr");
  return EXCLUDED_INSTITUTION_KEYWORDS.some((kw) => lower.includes(kw));
}

type RawWithProvider = RawDiscoveredLead & { provider: DiscoveryProvider };

/**
 * Finds already-saved businesses by Google Place ID (via business_sources) and normalized phone.
 * Returns a lookup from place id / normalized phone to business id.
 */
async function findExistingBusinessIds(
  items: Array<{ external_id?: string | null; phone?: string | null }>
): Promise<Map<string, string>> {
  const externalIds = items.map((r) => r.external_id).filter((v): v is string => !!v);
  const phones = items.map((r) => normalizePhone(r.phone)).filter((v): v is string => !!v);

  const [sourceRes, phoneRes] = await Promise.all([
    externalIds.length > 0
      ? supabaseAdmin
          .from("business_sources")
          .select("business_id, external_id")
          .eq("provider", "google_maps")
          .in("external_id", externalIds)
      : Promise.resolve({ data: [] as Array<{ business_id: string; external_id: string }> }),
    phones.length > 0
      ? supabaseAdmin.from("businesses").select("id, phone_normalized").in("phone_normalized", phones)
      : Promise.resolve({ data: [] as Array<{ id: string; phone_normalized: string }> }),
  ]);

  const map = new Map<string, string>();
  for (const s of sourceRes.data || []) if (s.external_id) map.set(s.external_id, s.business_id);
  for (const b of phoneRes.data || []) if (b.phone_normalized) map.set(b.phone_normalized, b.id);
  return map;
}

function lookupExisting(
  map: Map<string, string>,
  item: { external_id?: string | null; phone?: string | null }
): string | undefined {
  const phone = normalizePhone(item.phone);
  return (item.external_id && map.get(item.external_id)) || (phone && map.get(phone)) || undefined;
}

async function buildCandidate(
  raw: RawWithProvider,
  query: DiscoveryQuery,
  chainNames: Set<string>,
  existingId: string | undefined
): Promise<DiscoveredCandidateLead> {
  let website = raw.website?.trim() || null;
  let instagram = raw.instagram || null;
  let presenceNote: string | null = null;

  const presence = classifyWebPresence(website);
  if (presence.kind === "social" || presence.kind === "platform") {
    presenceNote = `Web sitesi yerine ${presence.platform} linki`;
    if (presence.instagram && !instagram) instagram = website;
    website = null;
  }

  let audit: AuditFields | null = null;
  let websiteStatus: DiscoveredCandidateLead["website_status"] = "NO_WEBSITE";

  if (website) {
    const scan = await scanWebsite(website);
    if (scan.redirectPlatform) {
      presenceNote = `Alan adı ${scan.redirectPlatform} sayfasına yönleniyor`;
      website = null;
    } else {
      audit = scanToAuditFields(scan);
      websiteStatus = websiteStatusFromHealth(scan.health);
    }
  }

  const phoneInfo = getPhoneInfo(raw.phone);
  const score = calculateLeadScore(
    {
      website,
      website_status: websiteStatus,
      rating: raw.rating ?? null,
      review_count: raw.review_count ?? 0,
      phone: raw.phone ?? null,
      instagram,
      is_excluded: false,
    },
    audit
  );

  return {
    tempId: raw.external_id || `${raw.name}-${raw.phone || Math.random()}`,
    name: raw.name,
    category: raw.category || query.sector,
    address: raw.address || null,
    city: raw.city || query.location,
    district: raw.district || query.district || null,
    phone: raw.phone || null,
    website,
    instagram,
    rating: raw.rating ?? null,
    review_count: raw.review_count ?? 0,
    external_id: raw.external_id || null,
    source_url: raw.source_url || null,
    provider: raw.provider,
    lead_score: score.score,
    priority: score.priority,
    score_reasons: score.reasons,
    website_status: websiteStatus,
    audit,
    phone_type: phoneInfo.type,
    chain_suspect: chainNames.has(normalizeName(raw.name)) || phoneInfo.type === "corporate",
    presence_note: presenceNote,
    already_saved: !!existingId,
    existing_business_id: existingId,
    raw_data: raw.raw_data,
  };
}

/**
 * Runs providers, scans websites concurrently and scores everything in memory.
 * Nothing is written to businesses — only the search record (for history/replay).
 */
export async function executeDiscovery(query: DiscoveryQuery): Promise<DiscoveryPreviewResult> {
  if (!query.location?.trim() || !query.sector?.trim()) {
    throw new Error("Konum (şehir) ve sektör alanları zorunludur.");
  }

  const selectedSources = query.sources.length > 0 ? query.sources : (["google_maps"] as DiscoveryProvider[]);

  const searchInsert = supabaseAdmin
    .from("searches")
    .insert({
      location: query.location.trim(),
      district: query.district?.trim() || null,
      sector: query.sector.trim(),
      sources: selectedSources,
      status: "processing",
    })
    .select("id, location, district, sector, sources, status, raw_count, unique_count, new_count, existing_count, error_message, created_at, completed_at")
    .single();

  const providerResults = Promise.all(
    selectedSources.map(async (source) => {
      const provider = providerRegistry.get(source);
      if (!provider) return [] as RawWithProvider[];
      const leads = await provider.discover({
        location: query.location,
        district: query.district,
        sector: query.sector,
        limit: query.limit,
      });
      return leads.map((lead) => ({ ...lead, provider: source }));
    })
  );

  const [{ data: searchRecord, error: searchCreateError }, rawLeadsNested] = await Promise.all([
    searchInsert,
    providerResults.catch((err: unknown) => err as Error),
  ]);

  if (searchCreateError || !searchRecord) {
    throw new Error(`Arama kaydı oluşturulamadı: ${searchCreateError?.message}`);
  }

  try {
    if (rawLeadsNested instanceof Error) throw rawLeadsNested;
    const rawLeads = rawLeadsNested.flat().filter((lead) => !isExcludedInstitution(lead.name));

    const nameCounts = new Map<string, number>();
    for (const lead of rawLeads) {
      const key = normalizeName(lead.name);
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    }
    const chainNames = new Set([...nameCounts].filter(([, count]) => count > 1).map(([name]) => name));

    const existingMap = await findExistingBusinessIds(rawLeads);

    const candidateLeads = await mapWithConcurrency(rawLeads, SCAN_CONCURRENCY, (raw) =>
      buildCandidate(raw, query, chainNames, lookupExisting(existingMap, raw))
    );

    candidateLeads.sort((a, b) => b.lead_score - a.lead_score);

    const existingCount = candidateLeads.filter((c) => c.already_saved).length;

    const { data: updatedSearch } = await supabaseAdmin
      .from("searches")
      .update({
        status: "completed",
        raw_count: rawLeads.length,
        unique_count: candidateLeads.length,
        new_count: candidateLeads.length - existingCount,
        existing_count: existingCount,
        raw_results: candidateLeads,
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchRecord.id)
      .select("id, location, district, sector, sources, status, raw_count, unique_count, new_count, existing_count, error_message, created_at, completed_at")
      .single();

    return {
      search: (updatedSearch || searchRecord) as SearchRecord,
      items: candidateLeads,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    await supabaseAdmin
      .from("searches")
      .update({ status: "failed", error_message: errMessage, completed_at: new Date().toISOString() })
      .eq("id", searchRecord.id);
    throw error;
  }
}

/**
 * Persists selected candidates with a handful of bulk queries instead of per-lead round trips.
 * Candidates that already exist in the CRM are left untouched (their CRM data is never overwritten).
 * Returns tempId → business id for every requested lead.
 */
export async function saveSelectedCandidateLeads(
  leads: DiscoveredCandidateLead[]
): Promise<{ savedCount: number; idsByTempId: Record<string, string> }> {
  const existingMap = await findExistingBusinessIds(leads);
  const idsByTempId: Record<string, string> = {};

  const seenKeys = new Set<string>();
  const toInsert: Array<{ id: string; lead: DiscoveredCandidateLead }> = [];

  for (const lead of leads) {
    const existingId = lookupExisting(existingMap, lead);
    if (existingId) {
      idsByTempId[lead.tempId] = existingId;
      continue;
    }
    // Guard against the same business appearing twice in one selection.
    const key = lead.external_id || normalizePhone(lead.phone) || lead.tempId;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const id = crypto.randomUUID();
    idsByTempId[lead.tempId] = id;
    toInsert.push({ id, lead });
  }

  if (toInsert.length === 0) return { savedCount: 0, idsByTempId };

  const { error: insertError } = await supabaseAdmin.from("businesses").insert(
    toInsert.map(({ id, lead }) => ({
      id,
      name: lead.name.trim(),
      category: lead.category || null,
      address: lead.address,
      city: lead.city,
      district: lead.district,
      phone: lead.phone,
      phone_normalized: normalizePhone(lead.phone),
      website: lead.website,
      website_domain: normalizeDomain(lead.website),
      instagram: lead.instagram,
      instagram_normalized: normalizeInstagram(lead.instagram),
      rating: lead.rating,
      review_count: lead.review_count,
      website_status: lead.website_status,
      crm_status: "NEW",
      lead_score: lead.lead_score,
      priority: lead.priority,
      score_reasons: lead.score_reasons,
      is_excluded: false,
      last_scanned_at: lead.audit ? new Date().toISOString() : null,
    }))
  );
  if (insertError) throw new Error(`İşletmeler kaydedilemedi: ${insertError.message}`);

  const withAudit = toInsert.filter(({ lead }) => lead.audit);
  const [sourcesRes, auditsRes] = await Promise.all([
    supabaseAdmin.from("business_sources").insert(
      toInsert.map(({ id, lead }) => ({
        business_id: id,
        provider: lead.provider,
        external_id: lead.external_id,
        source_url: lead.source_url,
        raw_data: lead.raw_data || {},
      }))
    ),
    withAudit.length > 0
      ? supabaseAdmin.from("website_audits").insert(
          withAudit.map(({ id, lead }) => ({ business_id: id, audit_type: "lightweight", ...lead.audit }))
        )
      : Promise.resolve({ error: null }),
  ]);
  if (sourcesRes.error) console.error("Kaynak kayıtları eklenemedi:", sourcesRes.error.message);
  if (auditsRes.error) console.error("Audit kayıtları eklenemedi:", auditsRes.error.message);

  return { savedCount: toInsert.length, idsByTempId };
}

/**
 * Replays past search results from DB without making an external Google API call.
 */
export async function getSearchWithCandidateResults(
  searchId: string
): Promise<{ search: SearchRecord; items: DiscoveredCandidateLead[] } | null> {
  const { data: search, error } = await supabaseAdmin.from("searches").select("*").eq("id", searchId).single();
  if (error || !search) return null;

  const rawResults = (search.raw_results || []) as DiscoveredCandidateLead[];
  delete search.raw_results;
  if (rawResults.length === 0) return { search, items: [] };

  const existingMap = await findExistingBusinessIds(rawResults);
  const refreshedItems = rawResults.map((lead) => {
    const existingId = lookupExisting(existingMap, lead);
    return { ...lead, already_saved: !!existingId, existing_business_id: existingId };
  });

  return { search, items: refreshedItems };
}

/**
 * Fetches recent search history (without the heavy raw_results payload).
 */
export async function getSearchHistory(limit: number = 20): Promise<SearchRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("searches")
    .select("id, location, district, sector, sources, status, raw_count, unique_count, new_count, existing_count, error_message, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Arama geçmişi alınamadı: ${error.message}`);
  }

  return (data || []) as SearchRecord[];
}
