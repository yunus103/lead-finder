import { supabaseAdmin } from "@/lib/supabase";
import { getLatestWebsiteAudit } from "@/services/website-service";
import { calculateLeadScore } from "./scoring/lead-scorer";
import { ScoreCalculationResult } from "@/types/scoring";
import { Business } from "@/types/business";

/**
 * Calculates and persists the lead score, priority, and explainability reasons for a single business.
 */
export async function updateBusinessScore(
  businessId: string
): Promise<ScoreCalculationResult> {
  const { data: business, error: bError } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (bError || !business) {
    throw new Error(`İşletme bulunamadı: ${bError?.message}`);
  }

  // Fetch latest audit if available
  const latestAudit = await getLatestWebsiteAudit(businessId);

  // Compute deterministic score
  const result = calculateLeadScore(business as Business, latestAudit);

  // Persist score, priority, and reasons to businesses table
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

/**
 * Recalculates lead scores for all businesses in the database.
 * Used when scoring rules are tuned or during bulk refresh.
 */
export async function recalculateAllScores(): Promise<{ count: number }> {
  const { data: businesses, error } = await supabaseAdmin
    .from("businesses")
    .select("*");

  if (error || !businesses) {
    throw new Error(`İşletmeler alınamadı: ${error?.message}`);
  }

  let count = 0;
  for (const b of businesses) {
    try {
      await updateBusinessScore(b.id);
      count++;
    } catch (err) {
      console.warn(`Puan hesaplama atlandı (${b.name}):`, err);
    }
  }

  return { count };
}
