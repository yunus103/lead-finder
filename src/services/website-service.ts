import { supabaseAdmin } from "@/lib/supabase";
import { normalizeInstagram, normalizePhone } from "@/lib/normalization";
import { WebsiteAudit } from "@/types/website";
import { WebsiteStatus } from "@/types/business";
import { scanWebsite } from "./website/scanner";
import { performDeepWebsiteAudit } from "./website/deep-audit";
import { calculateLeadScore } from "./scoring/lead-scorer";

/**
 * Runs a lightweight scan for a business and persists the result to website_audits.
 * Updates the business record with last_scanned_at, website_status, and enriches contacts if missing.
 */
export async function performLightweightAudit(
  businessId: string,
  targetUrl?: string
): Promise<WebsiteAudit | null> {
  // 1. Fetch business record
  const { data: business, error: bError } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (bError || !business) {
    throw new Error(`İşletme bulunamadı: ${bError?.message}`);
  }

  const urlToScan = targetUrl || business.website;
  if (!urlToScan || !urlToScan.trim()) {
    // No website available
    await supabaseAdmin
      .from("businesses")
      .update({
        website_status: "NO_WEBSITE",
        last_scanned_at: new Date().toISOString(),
      })
      .eq("id", businessId);
    return null;
  }

  // 2. Perform the scan
  const scan = await scanWebsite(urlToScan);

  // 3. Map status to canonical WebsiteStatus
  let newWebsiteStatus: WebsiteStatus = "UNREACHABLE";
  if (scan.status === "success") {
    newWebsiteStatus = "HAS_WEBSITE";
  } else if (scan.status === "unreachable" || scan.status === "timeout" || scan.status === "ssl_error") {
    newWebsiteStatus = "UNREACHABLE";
  }

  // 4. Persist audit record in website_audits
  const auditPayload = {
    business_id: businessId,
    audit_type: "lightweight",
    url: scan.url,
    status: scan.status,
    http_status: scan.httpStatus,
    response_time_ms: scan.responseTimeMs,
    is_https: scan.isHttps,
    title: scan.title,
    meta_description: scan.metaDescription,
    h1: scan.h1,
    has_viewport: scan.hasViewport,
    technologies: scan.technologies,
    social_links: scan.socialLinks,
    contact_emails: scan.contactEmails,
    contact_phones: scan.contactPhones,
    deep_audit_data: {
      hasWhatsApp: scan.hasWhatsApp,
      hasCallButton: scan.hasCallButton,
      isMobileResponsive: scan.hasViewport,
      speedLabel:
        scan.responseTimeMs > 1500 ? `Yavaş (${scan.responseTimeMs} ms)` : "Normal / Hızlı",
      salesPitch: "",
      problems: [],
    },
  };

  const { data: auditRecord, error: auditError } = await supabaseAdmin
    .from("website_audits")
    .insert(auditPayload)
    .select("*")
    .single();

  if (auditError) {
    console.error("Website audit kaydı oluşturulamadı:", auditError.message);
  }

  // 5. Enrich business contacts if missing and update status
  const businessUpdates: Record<string, unknown> = {
    website_status: newWebsiteStatus,
    last_scanned_at: new Date().toISOString(),
  };

  // Enrich phone if business doesn't have one and scan found one
  if (!business.phone && scan.contactPhones.length > 0) {
    const discoveredPhone = scan.contactPhones[0];
    businessUpdates.phone = discoveredPhone;
    businessUpdates.phone_normalized = normalizePhone(discoveredPhone);
  }

  // Enrich instagram if business doesn't have one and scan found one
  if (!business.instagram && scan.socialLinks.instagram) {
    businessUpdates.instagram = scan.socialLinks.instagram;
    businessUpdates.instagram_normalized = normalizeInstagram(scan.socialLinks.instagram);
  }

  // Recalculate lead score with the fresh audit data
  const mergedForScoring = { ...business, ...businessUpdates };
  const scoreResult = calculateLeadScore(mergedForScoring, auditRecord);
  businessUpdates.lead_score = scoreResult.score;
  businessUpdates.priority = scoreResult.priority;
  businessUpdates.score_reasons = scoreResult.reasons;

  await supabaseAdmin
    .from("businesses")
    .update(businessUpdates)
    .eq("id", businessId);

  return auditRecord || null;
}

/**
 * Runs an on-demand deep audit for a specific business.
 * Persists comprehensive structural audit and sales opportunity tags.
 */
export async function performDeepAudit(
  businessId: string
): Promise<WebsiteAudit | null> {
  const { data: business, error: bError } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (bError || !business) {
    throw new Error(`İşletme bulunamadı: ${bError?.message}`);
  }

  if (!business.website) {
    throw new Error("Bu işletmenin kayıtlı bir web sitesi adresi yok.");
  }

  const { scan, deepData } = await performDeepWebsiteAudit(business.website);

  let newWebsiteStatus: WebsiteStatus = "UNREACHABLE";
  if (scan.status === "success") {
    newWebsiteStatus = "HAS_WEBSITE";
  } else if (scan.status === "unreachable" || scan.status === "timeout" || scan.status === "ssl_error") {
    newWebsiteStatus = "UNREACHABLE";
  }

  const auditPayload = {
    business_id: businessId,
    audit_type: "deep",
    url: scan.url,
    status: scan.status,
    http_status: scan.httpStatus,
    response_time_ms: scan.responseTimeMs,
    is_https: scan.isHttps,
    title: scan.title,
    meta_description: scan.metaDescription,
    h1: scan.h1,
    has_viewport: scan.hasViewport,
    technologies: scan.technologies,
    social_links: scan.socialLinks,
    contact_emails: scan.contactEmails,
    contact_phones: scan.contactPhones,
    deep_audit_data: deepData,
  };

  const { data: auditRecord, error: auditError } = await supabaseAdmin
    .from("website_audits")
    .insert(auditPayload)
    .select("*")
    .single();

  if (auditError) {
    console.error("Deep audit kaydı oluşturulamadı:", auditError.message);
  }

  const scoreResult = calculateLeadScore(
    { ...business, website_status: newWebsiteStatus },
    auditRecord
  );

  await supabaseAdmin
    .from("businesses")
    .update({
      website_status: newWebsiteStatus,
      last_scanned_at: new Date().toISOString(),
      lead_score: scoreResult.score,
      priority: scoreResult.priority,
      score_reasons: scoreResult.reasons,
    })
    .eq("id", businessId);

  return auditRecord || null;
}

/**
 * Retrieves the latest audit for a business.
 */
export async function getLatestWebsiteAudit(businessId: string): Promise<WebsiteAudit | null> {
  const { data, error } = await supabaseAdmin
    .from("website_audits")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("En son website denetimi alınamadı:", error.message);
    return null;
  }

  return data;
}

/**
 * Retrieves audit history for a business.
 */
export async function getWebsiteAuditHistory(
  businessId: string,
  limit = 5
): Promise<WebsiteAudit[]> {
  const { data, error } = await supabaseAdmin
    .from("website_audits")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Website denetim geçmişi alınamadı:", error.message);
    return [];
  }

  return data || [];
}
