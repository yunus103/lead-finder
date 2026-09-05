import { supabaseAdmin } from "@/lib/supabase";
import { DiscoveryProvider } from "@/types/business";
import { ingestBusiness } from "@/services/business-service";
import { performDeepAudit } from "@/services/website-service";
import { scanWebsite } from "@/services/website/scanner";
import { calculateLeadScore } from "@/services/scoring/lead-scorer";
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

// Provider registry allows providers to be registered dynamically
const providerRegistry = new Map<DiscoveryProvider, IDiscoveryProvider>();

// Register default/active providers
export function registerProvider(provider: IDiscoveryProvider) {
  providerRegistry.set(provider.name, provider);
}

// Register live Google Maps provider
registerProvider(new GoogleMapsProvider());

// Mocks for future phases (Phase 09 Search, Phase 10 Instagram)
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

/**
 * Executes an in-memory discovery preview operation across selected providers.
 * Performs real-time scoring and lightweight website scans in memory WITHOUT saving to database.
 */
export async function executeDiscovery(
  query: DiscoveryQuery
): Promise<DiscoveryPreviewResult> {
  if (!query.location?.trim() || !query.sector?.trim()) {
    throw new Error("Konum (şehir) ve sektör alanları zorunludur.");
  }

  const selectedSources = query.sources.length > 0 ? query.sources : (["google_maps"] as DiscoveryProvider[]);

  // 1. Create initial search history record (tracks the search itself)
  const { data: searchRecord, error: searchCreateError } = await supabaseAdmin
    .from("searches")
    .insert({
      location: query.location.trim(),
      district: query.district?.trim() || null,
      sector: query.sector.trim(),
      sources: selectedSources,
      status: "processing",
    })
    .select("*")
    .single();

  if (searchCreateError || !searchRecord) {
    throw new Error(`Arama kaydı oluşturulamadı: ${searchCreateError?.message}`);
  }

  try {
    const rawLeads: Array<RawDiscoveredLead & { provider: DiscoveryProvider }> = [];

    // 2. Query each selected provider for raw places
    for (const source of selectedSources) {
      const provider = providerRegistry.get(source);
      if (!provider) {
        console.warn(`Uyarı: '${source}' için kayıtlı sağlayıcı bulunamadı.`);
        continue;
      }

      const leads = await provider.discover({
        location: query.location,
        district: query.district,
        sector: query.sector,
        limit: query.limit,
      });

      for (const lead of leads) {
        if (isExcludedInstitution(lead.name)) {
          continue;
        }
        rawLeads.push({ ...lead, provider: source });
      }

    }

    // 3. Batch check against existing businesses in DB
    const externalIds = rawLeads.map((r) => r.external_id).filter(Boolean) as string[];
    const phones = rawLeads.map((r) => r.phone).filter(Boolean) as string[];

    const existingMap = new Map<string, { id: string; name: string }>();

    if (externalIds.length > 0) {
      const { data: matches } = await supabaseAdmin
        .from("businesses")
        .select("id, name, google_place_id, phone")
        .in("google_place_id", externalIds);

      if (matches) {
        for (const m of matches) {
          if (m.google_place_id) existingMap.set(m.google_place_id, m);
          if (m.phone) existingMap.set(m.phone, m);
        }
      }
    }

    if (phones.length > 0) {
      const { data: matches } = await supabaseAdmin
        .from("businesses")
        .select("id, name, google_place_id, phone")
        .in("phone", phones);

      if (matches) {
        for (const m of matches) {
          if (m.phone) existingMap.set(m.phone, m);
          if (m.google_place_id) existingMap.set(m.google_place_id, m);
        }
      }
    }

    // 4. In-memory scanning & lead scoring
    const candidateLeads: DiscoveredCandidateLead[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < rawLeads.length; i += BATCH_SIZE) {
      const batch = rawLeads.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (raw): Promise<DiscoveredCandidateLead> => {
          const existing =
            (raw.external_id && existingMap.get(raw.external_id)) ||
            (raw.phone && existingMap.get(raw.phone)) ||
            undefined;

          const tempId = raw.external_id || `${raw.name}-${raw.phone || Math.random()}`;

          // No website case: instant calculation
          if (!raw.website || raw.website.trim() === "") {
            const scoreResult = calculateLeadScore({
              website: null,
              website_status: "NO_WEBSITE",
              rating: raw.rating ?? null,
              review_count: raw.review_count ?? 0,
              phone: raw.phone ?? null,
              instagram: raw.instagram ?? null,
              is_excluded: false,
            });

            return {
              tempId,
              name: raw.name,
              category: raw.category || query.sector,
              address: raw.address || null,
              city: raw.city || query.location,
              district: raw.district || query.district || null,
              phone: raw.phone || null,
              website: null,
              instagram: raw.instagram || null,
              rating: raw.rating ?? null,
              review_count: raw.review_count ?? 0,
              external_id: raw.external_id || null,
              source_url: raw.source_url || null,
              provider: raw.provider,
              lead_score: scoreResult.score,
              priority: scoreResult.priority,
              score_reasons: scoreResult.reasons,
              website_status: "NO_WEBSITE",
              audit_preview: null,
              already_saved: !!existing,
              existing_business_id: existing?.id,
              raw_data: raw.raw_data,
            };
          }

          // Has website: Perform lightweight scan in memory
          try {
            const scan = await scanWebsite(raw.website);
            const isReachable = scan.status === "success";
            const websiteStatus = isReachable ? "HAS_WEBSITE" : "UNREACHABLE";

            const simulatedAudit = isReachable
              ? {
                  has_viewport: scan.hasViewport,
                  response_time_ms: scan.responseTimeMs,
                  is_https: scan.isHttps,
                  deep_audit_data: {
                    hasWhatsApp: scan.hasWhatsApp,
                    hasCallButton: scan.hasCallButton,
                    isMobileResponsive: scan.hasViewport,
                    speedLabel: scan.responseTimeMs > 2500 ? "Yavaş" : scan.responseTimeMs > 1500 ? "Orta" : "Hızlı",
                    salesPitch: "",
                    problems: [],
                  },
                  technologies: scan.technologies || [],
                }
              : null;

            const scoreResult = calculateLeadScore(
              {
                website: raw.website,
                website_status: websiteStatus,
                rating: raw.rating ?? null,
                review_count: raw.review_count ?? 0,
                phone: raw.phone ?? null,
                instagram: raw.instagram ?? null,
                is_excluded: false,
              },
              simulatedAudit as any
            );

            return {
              tempId,
              name: raw.name,
              category: raw.category || query.sector,
              address: raw.address || null,
              city: raw.city || query.location,
              district: raw.district || query.district || null,
              phone: raw.phone || null,
              website: raw.website,
              instagram: raw.instagram || null,
              rating: raw.rating ?? null,
              review_count: raw.review_count ?? 0,
              external_id: raw.external_id || null,
              source_url: raw.source_url || null,
              provider: raw.provider,
              lead_score: scoreResult.score,
              priority: scoreResult.priority,
              score_reasons: scoreResult.reasons,
              website_status: websiteStatus,
              audit_preview: isReachable
                ? {
                    is_https: scan.isHttps,
                    has_viewport: scan.hasViewport,
                    has_whatsapp: scan.hasWhatsApp,
                    response_time_ms: scan.responseTimeMs,
                  }
                : null,
              already_saved: !!existing,
              existing_business_id: existing?.id,
              raw_data: raw.raw_data,
            };
          } catch {
            const scoreResult = calculateLeadScore({
              website: raw.website,
              website_status: "UNREACHABLE",
              rating: raw.rating ?? null,
              review_count: raw.review_count ?? 0,
              phone: raw.phone ?? null,
              instagram: raw.instagram ?? null,
              is_excluded: false,
            });

            return {
              tempId,
              name: raw.name,
              category: raw.category || query.sector,
              address: raw.address || null,
              city: raw.city || query.location,
              district: raw.district || query.district || null,
              phone: raw.phone || null,
              website: raw.website,
              instagram: raw.instagram || null,
              rating: raw.rating ?? null,
              review_count: raw.review_count ?? 0,
              external_id: raw.external_id || null,
              source_url: raw.source_url || null,
              provider: raw.provider,
              lead_score: scoreResult.score,
              priority: scoreResult.priority,
              score_reasons: scoreResult.reasons,
              website_status: "UNREACHABLE",
              audit_preview: null,
              already_saved: !!existing,
              existing_business_id: existing?.id,
              raw_data: raw.raw_data,
            };
          }
        })
      );
      candidateLeads.push(...batchResults);
    }

    // Sort descending by lead_score (highest priority leads at top)
    candidateLeads.sort((a, b) => b.lead_score - a.lead_score);

    const existingCount = candidateLeads.filter((c) => c.already_saved).length;
    const newCount = candidateLeads.length - existingCount;

    // 5. Update searches table with final metrics and raw_results
    const updatePayload: Record<string, unknown> = {
      status: "completed",
      raw_count: rawLeads.length,
      unique_count: candidateLeads.length,
      new_count: newCount,
      existing_count: existingCount,
      raw_results: candidateLeads,
      completed_at: new Date().toISOString(),
    };

    let updatedSearch: SearchRecord | null = null;
    const { data: updateRes, error: updateError } = await supabaseAdmin
      .from("searches")
      .update(updatePayload)
      .eq("id", searchRecord.id)
      .select("*")
      .single();

    if (updateError) {
      // Fallback without raw_results if column not yet migrated
      console.warn("Searches raw_results column not yet created, saving without it:", updateError.message);
      delete updatePayload.raw_results;
      const { data: fallbackRes } = await supabaseAdmin
        .from("searches")
        .update(updatePayload)
        .eq("id", searchRecord.id)
        .select("*")
        .single();
      updatedSearch = fallbackRes;
    } else {
      updatedSearch = updateRes;
    }

    return {
      search: updatedSearch || searchRecord,
      items: candidateLeads,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    await supabaseAdmin
      .from("searches")
      .update({
        status: "failed",
        error_message: errMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchRecord.id);

    throw error;
  }
}

/**
 * Persists selected candidate leads to the database via fast batch CRUD.
 * Does not block on live HTTP website scans (audits run on-demand on lead detail page).
 */
export async function saveSelectedCandidateLeads(
  leads: DiscoveredCandidateLead[]
): Promise<{ savedCount: number; savedIds: string[] }> {
  const savedIds: string[] = [];

  for (const lead of leads) {
    const ingestRes = await ingestBusiness({
      name: lead.name,
      category: lead.category,
      address: lead.address,
      city: lead.city,
      district: lead.district,
      phone: lead.phone,
      website: lead.website,
      instagram: lead.instagram,
      rating: lead.rating,
      review_count: lead.review_count,
      provider: lead.provider,
      external_id: lead.external_id,
      source_url: lead.source_url,
      raw_data: lead.raw_data,
    });

    const businessId = ingestRes.business.id;
    savedIds.push(businessId);

    // Fast batch write: update score, priority, reasons, and website status
    await supabaseAdmin
      .from("businesses")
      .update({
        website_status: lead.website_status,
        lead_score: lead.lead_score,
        priority: lead.priority,
        score_reasons: lead.score_reasons,
        last_scanned_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    // If we already collected lightweight audit details during discovery, persist it immediately without external fetch
    if (lead.website && lead.audit_preview) {
      try {
        await supabaseAdmin.from("website_audits").insert({
          business_id: businessId,
          audit_type: "lightweight",
          url: lead.website,
          status: "success",
          response_time_ms: lead.audit_preview.response_time_ms,
          is_https: lead.audit_preview.is_https,
          has_viewport: lead.audit_preview.has_viewport,
          technologies: [],
          deep_audit_data: {
            hasWhatsApp: lead.audit_preview.has_whatsapp,
            hasCallButton: true,
            isMobileResponsive: lead.audit_preview.has_viewport,
            speedLabel:
              lead.audit_preview.response_time_ms > 2500
                ? "Yavaş"
                : lead.audit_preview.response_time_ms > 1500
                ? "Orta"
                : "Hızlı",
            salesPitch: "",
            problems: [],
          },
        });
      } catch (auditInsertErr) {
        console.warn("Lightweight audit insert warning on save:", auditInsertErr);
      }
    }
  }

  return { savedCount: savedIds.length, savedIds };
}

/**
 * Replays past search results from DB without making an external Google API call.
 */
export async function getSearchWithCandidateResults(
  searchId: string
): Promise<{ search: SearchRecord; items: DiscoveredCandidateLead[] } | null> {
  const { data: search, error } = await supabaseAdmin
    .from("searches")
    .select("*")
    .eq("id", searchId)
    .single();

  if (error || !search) {
    return null;
  }

  const rawResults = (search.raw_results || []) as DiscoveredCandidateLead[];
  if (rawResults.length === 0) {
    return { search, items: [] };
  }

  // Refresh already_saved status against current DB
  const externalIds = rawResults.map((r) => r.external_id).filter(Boolean) as string[];
  const phones = rawResults.map((r) => r.phone).filter(Boolean) as string[];

  const existingMap = new Map<string, { id: string; name: string }>();

  if (externalIds.length > 0) {
    const { data: matches } = await supabaseAdmin
      .from("businesses")
      .select("id, name, google_place_id, phone")
      .in("google_place_id", externalIds);

    if (matches) {
      for (const m of matches) {
        if (m.google_place_id) existingMap.set(m.google_place_id, m);
        if (m.phone) existingMap.set(m.phone, m);
      }
    }
  }

  if (phones.length > 0) {
    const { data: matches } = await supabaseAdmin
      .from("businesses")
      .select("id, name, google_place_id, phone")
      .in("phone", phones);

    if (matches) {
      for (const m of matches) {
        if (m.phone) existingMap.set(m.phone, m);
        if (m.google_place_id) existingMap.set(m.google_place_id, m);
      }
    }
  }

  const refreshedItems = rawResults.map((lead) => {
    const existing =
      (lead.external_id ? existingMap.get(lead.external_id) : undefined) ||
      (lead.phone ? existingMap.get(lead.phone) : undefined);
    return {
      ...lead,
      already_saved: !!existing,
      existing_business_id: existing?.id || lead.existing_business_id,
    };

  });

  return { search, items: refreshedItems };
}

/**
 * Fetches recent search history.
 */
export async function getSearchHistory(limit: number = 20): Promise<SearchRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("searches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Arama geçmişi alınamadı: ${error.message}`);
  }

  return data || [];
}

