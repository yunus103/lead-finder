import { Business } from "@/types/business";
import { WebsiteAudit } from "@/types/website";
import { LeadPriority, ScoreCalculationResult, ScoreReason } from "@/types/scoring";

/**
 * Weights configuration for deterministic lead scoring.
 * All values are centralized here for easy tuning.
 */
export const SCORING_WEIGHTS = {
  // Website opportunity signals
  NO_WEBSITE: 35,
  UNREACHABLE_WEBSITE: 30,
  MISSING_VIEWPORT: 10,
  SLOW_RESPONSE: 8,
  MISSING_SSL: 8,
  MISSING_WHATSAPP: 5,
  HEAVY_WORDPRESS: 5,
  MODERN_FAST_SITE_PENALTY: -20,

  // Commercial viability & reputation signals
  REVIEWS_100_PLUS: 20,
  REVIEWS_30_TO_99: 15,
  REVIEWS_10_TO_29: 8,
  REVIEWS_UNDER_10: 3,
  RATING_4_5_PLUS: 15,
  RATING_4_0_TO_4_4: 10,
  RATING_3_5_TO_3_9: 5,

  // Outreach reachability signals
  PHONE_AVAILABLE: 15,
  INSTAGRAM_AVAILABLE: 5,
  EMAIL_DISCOVERED: 5,

  // Exclusion penalty
  EXCLUDED_PENALTY: -50,
};

/**
 * Maps a numeric 0–100 score to its operational priority category.
 */
export function getPriorityFromScore(score: number): LeadPriority {
  if (score >= 80) return "HOT";
  if (score >= 60) return "WARM";
  if (score >= 40) return "COLD";
  return "LOW";
}

/**
 * Pure, deterministic lead scoring function.
 * Evaluates website opportunity, commercial viability, and outreach reachability.
 */
export function calculateLeadScore(
  business: Pick<
    Business,
    "website" | "website_status" | "rating" | "review_count" | "phone" | "instagram" | "is_excluded"
  >,
  audit?: WebsiteAudit | null
): ScoreCalculationResult {
  const reasons: ScoreReason[] = [];
  let rawScore = 0;

  // -------------------------------------------------------------
  // 1. Website Opportunity Signals (Max ~40 pts)
  // -------------------------------------------------------------
  const hasNoWebsite =
    business.website_status === "NO_WEBSITE" ||
    !business.website ||
    business.website.trim() === "";

  if (hasNoWebsite) {
    rawScore += SCORING_WEIGHTS.NO_WEBSITE;
    reasons.push({
      label: "Web sitesi bulunmuyor (Yeni site fırsatı)",
      points: SCORING_WEIGHTS.NO_WEBSITE,
      type: "positive",
      category: "website",
    });
  } else if (business.website_status === "UNREACHABLE") {
    rawScore += SCORING_WEIGHTS.UNREACHABLE_WEBSITE;
    reasons.push({
      label: "Web sitesi çökmüş / erişilemez durumda",
      points: SCORING_WEIGHTS.UNREACHABLE_WEBSITE,
      type: "positive",
      category: "website",
    });
  } else if (audit) {
    // We have an active audit to inspect
    if (!audit.has_viewport) {
      rawScore += SCORING_WEIGHTS.MISSING_VIEWPORT;
      reasons.push({
        label: "Mobil uyumlu değil (Viewport etiketi eksik)",
        points: SCORING_WEIGHTS.MISSING_VIEWPORT,
        type: "positive",
        category: "website",
      });
    }

    if ((audit.response_time_ms || 0) > 1500) {
      rawScore += SCORING_WEIGHTS.SLOW_RESPONSE;
      reasons.push({
        label: `Yavaş web sitesi (${audit.response_time_ms} ms yanıt süresi)`,
        points: SCORING_WEIGHTS.SLOW_RESPONSE,
        type: "positive",
        category: "website",
      });
    }

    if (!audit.is_https) {
      rawScore += SCORING_WEIGHTS.MISSING_SSL;
      reasons.push({
        label: "SSL güvenlik sertifikası yok (HTTP)",
        points: SCORING_WEIGHTS.MISSING_SSL,
        type: "positive",
        category: "website",
      });
    }

    if (audit.deep_audit_data && !audit.deep_audit_data.hasWhatsApp) {
      rawScore += SCORING_WEIGHTS.MISSING_WHATSAPP;
      reasons.push({
        label: "Hızlı WhatsApp butonu bulunmuyor (Dönüşüm kaybı)",
        points: SCORING_WEIGHTS.MISSING_WHATSAPP,
        type: "positive",
        category: "website",
      });
    }

    if (audit.technologies?.includes("WordPress") && (audit.response_time_ms || 0) > 1000) {
      rawScore += SCORING_WEIGHTS.HEAVY_WORDPRESS;
      reasons.push({
        label: "Ağır WordPress altyapısı ve yavaş yükleme",
        points: SCORING_WEIGHTS.HEAVY_WORDPRESS,
        type: "positive",
        category: "website",
      });
    }

    // Negative penalty for modern, fast, well-built sites
    const isModernStack =
      audit.technologies?.includes("Next.js") || audit.technologies?.includes("React");
    const isFast = (audit.response_time_ms || 0) < 600;
    if (isModernStack && isFast && audit.is_https && audit.has_viewport && audit.meta_description) {
      rawScore += SCORING_WEIGHTS.MODERN_FAST_SITE_PENALTY;
      reasons.push({
        label: "Modern, hızlı ve eksiksiz web sitesi mevcut",
        points: SCORING_WEIGHTS.MODERN_FAST_SITE_PENALTY,
        type: "negative",
        category: "website",
      });
    }
  }

  // -------------------------------------------------------------
  // 2. Commercial Viability & Reputation (Max ~35 pts)
  // -------------------------------------------------------------
  const reviews = business.review_count || 0;
  if (reviews >= 100) {
    rawScore += SCORING_WEIGHTS.REVIEWS_100_PLUS;
    reasons.push({
      label: `100'den fazla Google yorumu (${reviews} değerlendirme)`,
      points: SCORING_WEIGHTS.REVIEWS_100_PLUS,
      type: "positive",
      category: "reputation",
    });
  } else if (reviews >= 30) {
    rawScore += SCORING_WEIGHTS.REVIEWS_30_TO_99;
    reasons.push({
      label: `Güçlü müşteri ilgisi (${reviews} Google yorumu)`,
      points: SCORING_WEIGHTS.REVIEWS_30_TO_99,
      type: "positive",
      category: "reputation",
    });
  } else if (reviews >= 10) {
    rawScore += SCORING_WEIGHTS.REVIEWS_10_TO_29;
    reasons.push({
      label: `Düzenli müşteri yorumu (${reviews} Google yorumu)`,
      points: SCORING_WEIGHTS.REVIEWS_10_TO_29,
      type: "positive",
      category: "reputation",
    });
  } else if (reviews > 0) {
    rawScore += SCORING_WEIGHTS.REVIEWS_UNDER_10;
    reasons.push({
      label: `Google incelemeleri mevcut (${reviews} yorum)`,
      points: SCORING_WEIGHTS.REVIEWS_UNDER_10,
      type: "positive",
      category: "reputation",
    });
  }

  const rating = business.rating;
  if (rating !== null && rating !== undefined) {
    if (rating >= 4.5) {
      rawScore += SCORING_WEIGHTS.RATING_4_5_PLUS;
      reasons.push({
        label: `Yüksek müşteri memnuniyeti (★ ${rating})`,
        points: SCORING_WEIGHTS.RATING_4_5_PLUS,
        type: "positive",
        category: "reputation",
      });
    } else if (rating >= 4.0) {
      rawScore += SCORING_WEIGHTS.RATING_4_0_TO_4_4;
      reasons.push({
        label: `İyi müşteri puanı (★ ${rating})`,
        points: SCORING_WEIGHTS.RATING_4_0_TO_4_4,
        type: "positive",
        category: "reputation",
      });
    } else if (rating >= 3.5) {
      rawScore += SCORING_WEIGHTS.RATING_3_5_TO_3_9;
      reasons.push({
        label: `Orta müşteri puanı (★ ${rating})`,
        points: SCORING_WEIGHTS.RATING_3_5_TO_3_9,
        type: "positive",
        category: "reputation",
      });
    }
  }

  // -------------------------------------------------------------
  // 3. Outreach Reachability (Max ~25 pts)
  // -------------------------------------------------------------
  if (business.phone && business.phone.trim()) {
    rawScore += SCORING_WEIGHTS.PHONE_AVAILABLE;
    reasons.push({
      label: "Doğrudan telefon numarası mevcut",
      points: SCORING_WEIGHTS.PHONE_AVAILABLE,
      type: "positive",
      category: "reachability",
    });
  }

  if (business.instagram && business.instagram.trim()) {
    rawScore += SCORING_WEIGHTS.INSTAGRAM_AVAILABLE;
    reasons.push({
      label: "Instagram profili mevcut",
      points: SCORING_WEIGHTS.INSTAGRAM_AVAILABLE,
      type: "positive",
      category: "reachability",
    });
  }

  if (audit?.contact_emails && audit.contact_emails.length > 0) {
    rawScore += SCORING_WEIGHTS.EMAIL_DISCOVERED;
    reasons.push({
      label: "Web sitesinden e-posta adresi tespit edildi",
      points: SCORING_WEIGHTS.EMAIL_DISCOVERED,
      type: "positive",
      category: "reachability",
    });
  }

  // -------------------------------------------------------------
  // 4. Penalties / Adjustments
  // -------------------------------------------------------------
  if (business.is_excluded) {
    rawScore += SCORING_WEIGHTS.EXCLUDED_PENALTY;
    reasons.push({
      label: "İşletme hariç tutulmuş / elenmiş",
      points: SCORING_WEIGHTS.EXCLUDED_PENALTY,
      type: "negative",
      category: "penalty",
    });
  }

  // Clamp score strictly between 0 and 100
  const finalScore = Math.min(100, Math.max(0, rawScore));
  const priority = getPriorityFromScore(finalScore);

  return {
    score: finalScore,
    priority,
    reasons,
  };
}
