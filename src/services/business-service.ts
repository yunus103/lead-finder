import { supabaseAdmin } from "@/lib/supabase";
import {
  Business,
  BusinessSource,
  DeduplicationMatchReason,
  IngestBusinessInput,
  IngestResult,
} from "@/types/business";
import {
  initialWebsiteStatus,
  normalizeDomain,
  normalizeInstagram,
  normalizeName,
  normalizePhone,
} from "@/lib/normalization";
import { calculateLeadScore } from "./scoring/lead-scorer";

/**
 * Searches for an existing business using progressively weaker signals:
 * 1. Google Place ID (via business_sources)
 * 2. Normalized phone
 * 3. Normalized website domain
 * 4. Normalized Instagram handle
 * 5. Normalized name + city match
 */
export async function findExistingBusiness(
  input: IngestBusinessInput
): Promise<{ business: Business; matchedBy: DeduplicationMatchReason } | null> {
  const phoneNormalized = normalizePhone(input.phone);
  const domainNormalized = normalizeDomain(input.website);
  const igNormalized = normalizeInstagram(input.instagram);

  // 1. Check Google Place ID in business_sources
  if (input.provider === "google_maps" && input.external_id) {
    const { data: sourceMatch } = await supabaseAdmin
      .from("business_sources")
      .select("business_id")
      .eq("provider", "google_maps")
      .eq("external_id", input.external_id)
      .limit(1)
      .maybeSingle();

    if (sourceMatch?.business_id) {
      const { data: business } = await supabaseAdmin
        .from("businesses")
        .select("*")
        .eq("id", sourceMatch.business_id)
        .single();

      if (business) {
        return { business, matchedBy: "google_place_id" };
      }
    }
  }

  // 2. Check normalized phone
  if (phoneNormalized) {
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("phone_normalized", phoneNormalized)
      .limit(1)
      .maybeSingle();

    if (business) {
      return { business, matchedBy: "phone" };
    }
  }

  // 3. Check website domain
  if (domainNormalized) {
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("website_domain", domainNormalized)
      .limit(1)
      .maybeSingle();

    if (business) {
      return { business, matchedBy: "website_domain" };
    }
  }

  // 4. Check Instagram handle
  if (igNormalized) {
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("instagram_normalized", igNormalized)
      .limit(1)
      .maybeSingle();

    if (business) {
      return { business, matchedBy: "instagram" };
    }
  }

  // 5. Check normalized name + city
  if (input.name && input.city) {
    const { data: candidates } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .ilike("city", input.city)
      .limit(25);

    if (candidates && candidates.length > 0) {
      const targetNormalized = normalizeName(input.name);
      const match = candidates.find(
        (c) => normalizeName(c.name) === targetNormalized
      );
      if (match) {
        return { business: match, matchedBy: "name_and_location" };
      }
    }
  }

  return null;
}

/**
 * Ingests a discovered business. Finds an existing match to enrich or creates a new canonical record.
 * Connects the source tracking item in business_sources.
 */
export async function ingestBusiness(
  input: IngestBusinessInput
): Promise<IngestResult> {
  const phoneNormalized = normalizePhone(input.phone);
  const domainNormalized = normalizeDomain(input.website);
  const igNormalized = normalizeInstagram(input.instagram);

  const existingMatch = await findExistingBusiness(input);

  let canonicalBusiness: Business;
  let isNew = false;
  let matchedBy: DeduplicationMatchReason | undefined;

  if (existingMatch) {
    matchedBy = existingMatch.matchedBy;
    const existing = existingMatch.business;

    // Build enrichment payload (only fill missing fields, never overwrite user CRM data)
    const enrichmentUpdates: Partial<Business> = {};

    if (!existing.phone && input.phone) {
      enrichmentUpdates.phone = input.phone;
      enrichmentUpdates.phone_normalized = phoneNormalized;
    }
    if (!existing.website && input.website) {
      enrichmentUpdates.website = input.website;
      enrichmentUpdates.website_domain = domainNormalized;
      enrichmentUpdates.website_status = initialWebsiteStatus(input.website);
    }
    if (!existing.instagram && input.instagram) {
      enrichmentUpdates.instagram = input.instagram;
      enrichmentUpdates.instagram_normalized = igNormalized;
    }
    if (!existing.category && input.category) {
      enrichmentUpdates.category = input.category;
    }
    if (!existing.address && input.address) {
      enrichmentUpdates.address = input.address;
    }
    if (!existing.city && input.city) {
      enrichmentUpdates.city = input.city;
    }
    if (!existing.district && input.district) {
      enrichmentUpdates.district = input.district;
    }
    // Update metrics if incoming data has newer/higher values
    if (input.rating !== undefined && input.rating !== null) {
      enrichmentUpdates.rating = input.rating;
    }
    if (input.review_count !== undefined && input.review_count > (existing.review_count || 0)) {
      enrichmentUpdates.review_count = input.review_count;
    }

    if (Object.keys(enrichmentUpdates).length > 0) {
      // Recalculate score with merged state
      const mergedBusiness = { ...existing, ...enrichmentUpdates };
      const scoreRes = calculateLeadScore(mergedBusiness);
      enrichmentUpdates.lead_score = scoreRes.score;
      enrichmentUpdates.priority = scoreRes.priority;
      enrichmentUpdates.score_reasons = scoreRes.reasons;

      const { data: updated, error } = await supabaseAdmin
        .from("businesses")
        .update(enrichmentUpdates)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to enrich business: ${error.message}`);
      }
      canonicalBusiness = updated;
    } else {
      canonicalBusiness = existing;
    }
  } else {
    // Create new canonical business
    isNew = true;
    const initialStatus = input.website_status || initialWebsiteStatus(input.website);
    const scoreRes =
      input.lead_score !== undefined
        ? { score: input.lead_score, priority: input.priority || "LOW", reasons: input.score_reasons || [] }
        : calculateLeadScore({
            website: input.website || null,
            website_status: initialStatus,
            rating: input.rating ?? null,
            review_count: input.review_count ?? 0,
            phone: input.phone || null,
            instagram: input.instagram || null,
            is_excluded: false,
          });

    const newRecord = {
      name: input.name.trim(),
      category: input.category || null,
      address: input.address || null,
      city: input.city || null,
      district: input.district || null,
      phone: input.phone || null,
      phone_normalized: phoneNormalized,
      website: input.website || null,
      website_domain: domainNormalized,
      instagram: input.instagram || null,
      instagram_normalized: igNormalized,
      rating: input.rating ?? null,
      review_count: input.review_count ?? 0,
      website_status: initialStatus,
      crm_status: "NEW",
      lead_score: scoreRes.score,
      priority: scoreRes.priority,
      score_reasons: scoreRes.reasons,
      is_excluded: false,
    };

    const { data: created, error } = await supabaseAdmin
      .from("businesses")
      .insert(newRecord)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create canonical business: ${error.message}`);
    }
    canonicalBusiness = created;
  }

  // Link source record in business_sources
  const { error: sourceError } = await supabaseAdmin
    .from("business_sources")
    .insert({
      business_id: canonicalBusiness.id,
      provider: input.provider,
      external_id: input.external_id || null,
      source_url: input.source_url || null,
      raw_data: input.raw_data || {},
    });

  if (sourceError) {
    console.error("Warning: Failed to persist business source record:", sourceError.message);
  }

  return {
    business: canonicalBusiness,
    isNew,
    matchedBy,
  };
}

/**
 * Retrieves businesses with optional search and filtering.
 */
export async function getBusinesses(options?: {
  search?: string;
  category?: string;
  websiteStatus?: string;
  priority?: string;
  crmStatus?: string;
  isExcluded?: boolean;
  followUpDue?: boolean;
  mobileOnly?: boolean;
  hasDemo?: boolean;
  sortBy?: "score" | "newest" | "demo_viewed";
  limit?: number;
  offset?: number;
}): Promise<{ businesses: Business[]; total: number }> {
  let query = supabaseAdmin
    .from("businesses")
    .select("*", { count: "exact" });

  if (options?.sortBy === "newest") {
    query = query.order("created_at", { ascending: false });
  } else if (options?.sortBy === "demo_viewed") {
    query = query
      .order("demo_last_viewed_at", { ascending: false, nullsFirst: false })
      .order("demo_created_at", { ascending: false, nullsFirst: false });
  } else {
    // Default: prioritize highest lead score first
    query = query
      .order("lead_score", { ascending: false })
      .order("created_at", { ascending: false });
  }

  // Exclusion filter: by default, show only active non-excluded leads
  if (options?.isExcluded !== undefined) {
    query = query.eq("is_excluded", options.isExcluded);
  } else {
    query = query.eq("is_excluded", false);
  }

  if (options?.crmStatus) {
    if (options.crmStatus === "TO_CALL_OR_NEW") {
      query = query.in("crm_status", ["NEW", "TO_CALL", "QUALIFIED"]);
    } else if (options.crmStatus === "OPPORTUNITY") {
      query = query.in("crm_status", ["INTERESTED", "MEETING", "PROPOSAL"]);
    } else {
      query = query.eq("crm_status", options.crmStatus);
    }
  }

  if (options?.followUpDue) {
    query = query
      .not("next_follow_up_at", "is", null)
      .lte("next_follow_up_at", new Date().toISOString());
  }

  if (options?.search) {
    query = query.ilike("name", `%${options.search}%`);
  }
  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.websiteStatus) {
    query = query.eq("website_status", options.websiteStatus);
  }
  if (options?.priority) {
    query = query.eq("priority", options.priority);
  }
  if (options?.hasDemo) {
    query = query.not("demo_url", "is", null);
  }
  if (options?.mobileOnly) {
    // normalizePhone stores Turkish mobiles as 905XXXXXXXXX
    query = query.like("phone_normalized", "905%");
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch businesses: ${error.message}`);
  }

  return {
    businesses: data || [],
    total: count || 0,
  };
}

/**
 * Retrieves a single business with all associated discovery source records.
 */
export async function getBusinessWithSources(id: string): Promise<{
  business: Business;
  sources: BusinessSource[];
} | null> {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*, business_sources(*)")
    .eq("id", id)
    .order("created_at", { referencedTable: "business_sources", ascending: false })
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { business_sources, ...business } = data as Business & { business_sources: BusinessSource[] | null };
  return { business, sources: business_sources || [] };
}
