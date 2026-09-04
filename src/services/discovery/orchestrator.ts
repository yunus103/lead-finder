import { supabaseAdmin } from "@/lib/supabase";
import { DiscoveryProvider } from "@/types/business";
import { ingestBusiness } from "@/services/business-service";
import {
  DiscoveredLeadItem,
  DiscoveryExecutionResult,
  DiscoveryQuery,
  IDiscoveryProvider,
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

/**
 * Executes a unified discovery operation across all selected providers.
 * Handles normalization, deduplication, search history persistence, and metric computation.
 */
export async function executeDiscovery(
  query: DiscoveryQuery
): Promise<DiscoveryExecutionResult> {
  if (!query.location?.trim() || !query.sector?.trim()) {
    throw new Error("Konum (şehir) ve sektör alanları zorunludur.");
  }

  const selectedSources = query.sources.length > 0 ? query.sources : (["google_maps"] as DiscoveryProvider[]);

  // 1. Create initial search history record
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

  const discoveredItems: DiscoveredLeadItem[] = [];
  const uniqueBusinessIds = new Set<string>();
  let rawCount = 0;
  let newCount = 0;
  let existingCount = 0;

  try {
    // 2. Query each selected provider
    for (const source of selectedSources) {
      const provider = providerRegistry.get(source);
      if (!provider) {
        console.warn(`Uyarı: '${source}' için kayıtlı sağlayıcı bulunamadı.`);
        continue;
      }

      const rawLeads = await provider.discover({
        location: query.location,
        district: query.district,
        sector: query.sector,
      });

      rawCount += rawLeads.length;

      // 3. Normalize, Deduplicate, and Ingest each lead
      for (const raw of rawLeads) {
        const ingestRes = await ingestBusiness({
          name: raw.name,
          category: raw.category || query.sector,
          address: raw.address,
          city: raw.city || query.location,
          district: raw.district || query.district,
          phone: raw.phone,
          website: raw.website,
          instagram: raw.instagram,
          rating: raw.rating,
          review_count: raw.review_count,
          provider: source,
          external_id: raw.external_id,
          source_url: raw.source_url,
          raw_data: raw.raw_data,
        });

        // Track metrics
        if (!uniqueBusinessIds.has(ingestRes.business.id)) {
          uniqueBusinessIds.add(ingestRes.business.id);
          if (ingestRes.isNew) {
            newCount++;
          } else {
            existingCount++;
          }
        }

        // Link in search_results
        await supabaseAdmin.from("search_results").insert({
          search_id: searchRecord.id,
          business_id: ingestRes.business.id,
          provider: source,
          is_new: ingestRes.isNew,
          matched_by: ingestRes.matchedBy || null,
        });

        discoveredItems.push({
          business: ingestRes.business,
          isNew: ingestRes.isNew,
          matchedBy: ingestRes.matchedBy,
          provider: source,
        });
      }
    }

    // 4. Update search record with final metrics
    const { data: updatedSearch, error: updateError } = await supabaseAdmin
      .from("searches")
      .update({
        status: "completed",
        raw_count: rawCount,
        unique_count: uniqueBusinessIds.size,
        new_count: newCount,
        existing_count: existingCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchRecord.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Arama özeti güncellenirken hata oluştu:", updateError.message);
    }

    return {
      search: updatedSearch || searchRecord,
      items: discoveredItems,
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
