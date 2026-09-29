import { supabaseAdmin } from "@/lib/supabase";
import { getLatestWebsiteAudit } from "@/services/website-service";
import { calculateLeadScore } from "./scoring/lead-scorer";
import { ScoreCalculationResult } from "@/types/scoring";

/**
 * Calculates and persists the lead score, priority, and explainability reasons for a single business.
 */
export async function updateBusinessScore(businessId: string): Promise<ScoreCalculationResult> {
  const [{ data: business, error: bError }, latestAudit] = await Promise.all([
    supabaseAdmin.from("businesses").select("*").eq("id", businessId).single(),
    getLatestWebsiteAudit(businessId),
  ]);

  if (bError || !business) {
    throw new Error(`İşletme bulunamadı: ${bError?.message}`);
  }

  const result = calculateLeadScore(business, latestAudit);

  const { error: updateError } = await supabaseAdmin
    .from("businesses")
    .update({
      lead_score: result.score,
      priority: result.priority,
      score_reasons: result.reasons,
    })
    .eq("id", businessId);

  if (updateError) {
    console.error("İşletme puanı güncellenirken hata oluştu:", updateError.message);
  }

  return result;
}
