import { supabaseAdmin } from "@/lib/supabase";
import { normalizeInstagram, normalizePhone } from "@/lib/normalization";
import { classifyWebPresence } from "@/lib/web-presence";
import { describeSiteProblems, scanToAuditFields, websiteStatusFromHealth } from "@/lib/site-analysis";
import { WebsiteAudit } from "@/types/website";
import { Business } from "@/types/business";
import { scanWebsite } from "./website/scanner";
import { runPageSpeed } from "./website/pagespeed";
import { calculateLeadScore } from "./scoring/lead-scorer";

async function getBusiness(businessId: string): Promise<Business> {
  const { data, error } = await supabaseAdmin.from("businesses").select("*").eq("id", businessId).single();
  if (error || !data) throw new Error(`İşletme bulunamadı: ${error?.message}`);
  return data;
}

async function saveBusinessWithScore(
  business: Business,
  updates: Partial<Business>,
  audit: WebsiteAudit | null
): Promise<void> {
  const merged = { ...business, ...updates };
  const score = calculateLeadScore(merged, audit);
  const { error } = await supabaseAdmin
    .from("businesses")
    .update({
      ...updates,
      lead_score: score.score,
      priority: score.priority,
      score_reasons: score.reasons,
    })
    .eq("id", business.id);
  if (error) console.error("İşletme güncellenemedi:", error.message);
}

/**
 * Marks a business whose "website" is really a social profile / marketplace page as having no website.
 * Moves an Instagram link into the instagram field so it is not lost.
 */
async function demoteToNoWebsite(business: Business, instagramUrl: string | null): Promise<void> {
  const updates: Partial<Business> = {
    website: null,
    website_domain: null,
    website_status: "NO_WEBSITE",
    last_scanned_at: new Date().toISOString(),
  };
  if (!business.instagram && instagramUrl) {
    updates.instagram = instagramUrl;
    updates.instagram_normalized = normalizeInstagram(instagramUrl);
  }
  await saveBusinessWithScore(business, updates, null);
}

/**
 * Scans the business website, persists an audit row, enriches missing contacts
 * and recalculates the lead score. Returns null when the business has no real website.
 */
export async function performWebsiteAudit(businessId: string): Promise<WebsiteAudit | null> {
  const business = await getBusiness(businessId);

  if (!business.website?.trim()) {
    await demoteToNoWebsite(business, null);
    return null;
  }

  const presence = classifyWebPresence(business.website);
  if (presence.kind === "social" || presence.kind === "platform") {
    await demoteToNoWebsite(business, presence.kind === "social" && presence.instagram ? business.website : null);
    return null;
  }

  const scan = await scanWebsite(business.website);
  if (scan.redirectPlatform) {
    await demoteToNoWebsite(business, null);
    return null;
  }

  const { data: audit, error } = await supabaseAdmin
    .from("website_audits")
    .insert({ business_id: businessId, audit_type: "deep", ...scanToAuditFields(scan) })
    .select("*")
    .single();
  if (error) console.error("Website audit kaydı oluşturulamadı:", error.message);

  const updates: Partial<Business> = {
    website_status: websiteStatusFromHealth(scan.health),
    last_scanned_at: new Date().toISOString(),
  };
  if (!business.phone && scan.contactPhones.length > 0) {
    updates.phone = scan.contactPhones[0];
    updates.phone_normalized = normalizePhone(scan.contactPhones[0]);
  }
  if (!business.instagram && scan.socialLinks.instagram) {
    updates.instagram = scan.socialLinks.instagram;
    updates.instagram_normalized = normalizeInstagram(scan.socialLinks.instagram);
  }

  await saveBusinessWithScore(business, updates, audit);
  return audit || null;
}

/**
 * Runs Google PageSpeed Insights on the latest audited URL and stores the result on that audit.
 */
export async function performPageSpeedAudit(businessId: string): Promise<WebsiteAudit> {
  const [business, latest] = await Promise.all([getBusiness(businessId), getLatestWebsiteAudit(businessId)]);
  if (!latest) throw new Error("Önce web sitesi taraması yapılmalı.");

  const pageSpeed = await runPageSpeed(latest.url);
  const deepAuditData = { ...latest.deep_audit_data, pageSpeed };
  deepAuditData.problems = describeSiteProblems({ ...latest, deep_audit_data: deepAuditData });

  const { data: updated, error } = await supabaseAdmin
    .from("website_audits")
    .update({ deep_audit_data: deepAuditData })
    .eq("id", latest.id)
    .select("*")
    .single();
  if (error || !updated) throw new Error(`PageSpeed sonucu kaydedilemedi: ${error?.message}`);

  await saveBusinessWithScore(business, {}, updated);
  return updated;
}

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
