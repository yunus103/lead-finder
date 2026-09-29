/**
 * One-off: re-scans every active lead with the current scanner and re-scores it.
 * Run locally (scans from your own network):
 *   npx tsx --env-file=.env.local scripts/rescan-leads.ts
 */
import { supabaseAdmin } from "../src/lib/supabase";
import { performWebsiteAudit } from "../src/services/website-service";
import { updateBusinessScore } from "../src/services/scoring-service";
import { mapWithConcurrency } from "../src/lib/concurrency";

async function main() {
  const { data: businesses, error } = await supabaseAdmin
    .from("businesses")
    .select("id, name, website, lead_score, priority")
    .eq("is_excluded", false);
  if (error || !businesses) throw new Error(error?.message);

  console.log(`${businesses.length} işletme yeniden taranıyor...`);
  let done = 0;

  await mapWithConcurrency(businesses, 8, async (b) => {
    try {
      if (b.website) await performWebsiteAudit(b.id);
      const result = await updateBusinessScore(b.id);
      done++;
      const change = result.priority !== b.priority ? `  ${b.priority} → ${result.priority}` : "";
      console.log(`[${done}/${businesses.length}] ${b.name}: ${b.lead_score} → ${result.score}${change}`);
    } catch (err) {
      console.warn(`Atlandı (${b.name}):`, err instanceof Error ? err.message : err);
    }
  });
}

main().then(() => process.exit(0));
