import { Business } from "@/types/business";
import { LeadPriority, ScoreCalculationResult, ScoreReason } from "@/types/scoring";
import { AuditFields, SLOW_SERVER_MS, auditHealth, isOutdatedYear } from "@/lib/site-analysis";
import { getPhoneInfo } from "@/lib/outreach";

export type ScoringBusiness = Pick<
  Business,
  "website" | "website_status" | "rating" | "review_count" | "phone" | "instagram" | "is_excluded"
>;

export type ScoringAudit = Pick<
  AuditFields,
  "status" | "has_viewport" | "is_https" | "response_time_ms" | "technologies" | "contact_emails" | "deep_audit_data"
>;

/**
 * Weights for deterministic lead scoring. The website opportunity acts as a gate:
 * a business whose site is already fine is capped below COLD no matter how good its
 * reputation is — reviews only make a real website opportunity more valuable.
 */
export const SCORING_WEIGHTS = {
  NO_WEBSITE: 40,
  PARKED_DOMAIN: 38,
  BROKEN_WEBSITE: 35,

  SSL_WARNING: 15,
  NOT_MOBILE: 15,
  NO_HTTPS: 12,
  OUTDATED: 10,
  FLASH: 10,
  PAGESPEED_LOW: 8,
  SLOW_SERVER: 5,
  NO_WHATSAPP: 3,
  NO_CALL_BUTTON: 2,
  WEBSITE_ISSUES_MAX: 35,
  /** Below this many issue points the existing site counts as "fine". */
  WEBSITE_ISSUES_GATE: 12,
  HEALTHY_SITE_SCORE_CAP: 29,

  REVIEWS_SWEET_SPOT: 15, // 20–399
  REVIEWS_LARGE: 8, // 400–1000
  REVIEWS_SOME: 8, // 5–19
  REVIEWS_FEW: 2, // 1–4
  REVIEWS_HUGE_PENALTY: -10, // >1000, likely chain / big brand
  RATING_HIGH: 10, // ≥ 4.3
  RATING_OK: 5, // ≥ 3.8

  MOBILE_PHONE: 15,
  LANDLINE_PHONE: 8,
  OTHER_PHONE: 5,
  CORPORATE_PHONE_PENALTY: -10,
  NO_PHONE_PENALTY: -15,
  INSTAGRAM_AVAILABLE: 5,
  EMAIL_DISCOVERED: 3,

  EXCLUDED_PENALTY: -50,
};

export function getPriorityFromScore(score: number): LeadPriority {
  if (score >= 70) return "HOT";
  if (score >= 50) return "WARM";
  if (score >= 30) return "COLD";
  return "LOW";
}

function scoreWebsite(
  business: ScoringBusiness,
  audit: ScoringAudit | null | undefined,
  add: (label: string, points: number, category: ScoreReason["category"]) => void
): { capped: boolean } {
  const W = SCORING_WEIGHTS;
  const hasNoWebsite = business.website_status === "NO_WEBSITE" || !business.website?.trim();

  if (hasNoWebsite) {
    add(
      business.instagram ? "Web sitesi yok, sadece Instagram kullanıyor" : "Web sitesi yok (yeni site fırsatı)",
      W.NO_WEBSITE,
      "website"
    );
    return { capped: false };
  }

  if (business.website_status === "UNREACHABLE") {
    const health = audit ? auditHealth(audit) : "down";
    const detail = audit?.deep_audit_data?.healthDetail;
    if (health === "parked") {
      add(`Alan adı var ama site yok${detail ? ` (${detail})` : ""}`, W.PARKED_DOMAIN, "website");
    } else {
      add(`Web sitesi açılmıyor${detail ? ` (${detail})` : ""}`, W.BROKEN_WEBSITE, "website");
    }
    return { capped: false };
  }

  // Unscanned site: no website signal either way.
  if (!audit) return { capped: false };

  const health = auditHealth(audit);
  if (health === "protected") {
    add("Site çalışıyor (bot korumalı, profesyonel altyapı)", 0, "website");
    return { capped: true };
  }
  if (health !== "ok") {
    add("Web sitesi açılmıyor", W.BROKEN_WEBSITE, "website");
    return { capped: false };
  }

  const d = audit.deep_audit_data;
  const issues: Array<[string, number]> = [];
  if (d?.sslIssue === "expired" || d?.sslIssue === "invalid") {
    issues.push(["Tarayıcı 'Güvenli değil' uyarısı veriyor (SSL sorunlu)", W.SSL_WARNING]);
  } else if (!audit.is_https) {
    issues.push(["HTTPS yok (Chrome 'Güvenli değil' gösteriyor)", W.NO_HTTPS]);
  }
  if (!audit.has_viewport) issues.push(["Mobil uyumlu değil", W.NOT_MOBILE]);
  if (isOutdatedYear(d?.copyrightYear)) issues.push([`Site eski görünüyor (telif ${d?.copyrightYear})`, W.OUTDATED]);
  if (audit.technologies?.includes("Flash")) issues.push(["Flash kullanıyor", W.FLASH]);
  if (d?.pageSpeed && d.pageSpeed.score < 50) {
    issues.push([`Google mobil hız puanı düşük (${d.pageSpeed.score}/100)`, W.PAGESPEED_LOW]);
  } else if (!d?.pageSpeed && (audit.response_time_ms || 0) > SLOW_SERVER_MS) {
    issues.push(["Sunucu çok yavaş yanıt veriyor", W.SLOW_SERVER]);
  }
  if (d && !d.hasWhatsApp) issues.push(["WhatsApp butonu yok", W.NO_WHATSAPP]);
  if (d && !d.hasCallButton) issues.push(["Tıklanabilir telefon yok", W.NO_CALL_BUTTON]);

  const total = issues.reduce((sum, [, pts]) => sum + pts, 0);
  let budget = W.WEBSITE_ISSUES_MAX;
  for (const [label, pts] of issues) {
    const granted = Math.min(pts, budget);
    if (granted <= 0) break;
    add(label, granted, "website");
    budget -= granted;
  }

  if (total < W.WEBSITE_ISSUES_GATE) {
    add("Mevcut site çalışır durumda — düşük fırsat", 0, "penalty");
    return { capped: true };
  }
  return { capped: false };
}

/**
 * Pure, deterministic lead scoring function.
 */
export function calculateLeadScore(
  business: ScoringBusiness,
  audit?: ScoringAudit | null
): ScoreCalculationResult {
  const W = SCORING_WEIGHTS;
  const reasons: ScoreReason[] = [];
  let rawScore = 0;

  const add = (label: string, points: number, category: ScoreReason["category"]) => {
    rawScore += points;
    reasons.push({ label, points, type: points < 0 || category === "penalty" ? "negative" : "positive", category });
  };

  const { capped } = scoreWebsite(business, audit, add);

  const reviews = business.review_count || 0;
  if (reviews > 1000) add(`Çok büyük işletme / zincir olabilir (${reviews} yorum)`, W.REVIEWS_HUGE_PENALTY, "reputation");
  else if (reviews >= 400) add(`Yoğun müşteri trafiği (${reviews} yorum)`, W.REVIEWS_LARGE, "reputation");
  else if (reviews >= 20) add(`Aktif ve oturmuş işletme (${reviews} yorum)`, W.REVIEWS_SWEET_SPOT, "reputation");
  else if (reviews >= 5) add(`Düzenli müşteri yorumu (${reviews} yorum)`, W.REVIEWS_SOME, "reputation");
  else if (reviews > 0) add(`Az yorum (${reviews})`, W.REVIEWS_FEW, "reputation");

  const rating = business.rating;
  if (rating !== null && rating !== undefined) {
    if (rating >= 4.3) add(`Yüksek müşteri memnuniyeti (★ ${rating})`, W.RATING_HIGH, "reputation");
    else if (rating >= 3.8) add(`İyi müşteri puanı (★ ${rating})`, W.RATING_OK, "reputation");
  }

  const phone = getPhoneInfo(business.phone);
  if (!business.phone?.trim()) add("Telefon numarası yok", W.NO_PHONE_PENALTY, "reachability");
  else if (phone.type === "mobile") add("Cep telefonu: sahibine direkt ulaşım + WhatsApp", W.MOBILE_PHONE, "reachability");
  else if (phone.type === "landline") add("Sabit hat telefonu mevcut", W.LANDLINE_PHONE, "reachability");
  else if (phone.type === "corporate") add("0850/444 kurumsal hat (zincir/büyük firma işareti)", W.CORPORATE_PHONE_PENALTY, "reachability");
  else add("Telefon numarası mevcut", W.OTHER_PHONE, "reachability");

  if (business.instagram?.trim()) add("Instagram profili mevcut", W.INSTAGRAM_AVAILABLE, "reachability");
  if (audit?.contact_emails && audit.contact_emails.length > 0) {
    add("Siteden e-posta adresi bulundu", W.EMAIL_DISCOVERED, "reachability");
  }

  if (business.is_excluded) add("İşletme hariç tutulmuş", W.EXCLUDED_PENALTY, "penalty");

  let finalScore = Math.min(100, Math.max(0, rawScore));
  if (capped) finalScore = Math.min(finalScore, W.HEALTHY_SITE_SCORE_CAP);

  return {
    score: finalScore,
    priority: getPriorityFromScore(finalScore),
    reasons,
  };
}
