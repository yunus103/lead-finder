import { supabaseAdmin } from "@/lib/supabase";
import { buildDemoPrompt } from "@/lib/demo-prompt";
import { pickAngle } from "@/lib/outreach";
import { getBusinessWithSources } from "./business-service";
import { getLatestWebsiteAudit } from "./website-service";
import { fetchPlaceDetails, PlaceDetails } from "./discovery/providers/google-maps-provider";

export type DemoFields = {
  demo_template: string | null;
  demo_slug: string | null;
  demo_url: string | null;
  demo_created_at: string | null;
  demo_sent_at: string | null;
};

/**
 * Builds the agent prompt. Hours and reviews come live from Google; if that call fails
 * the prompt is still returned without them, with a warning.
 */
export async function createDemoPrompt(
  businessId: string,
  templateId: string,
  slug: string
): Promise<{ prompt: string; warning: string | null }> {
  const [data, audit] = await Promise.all([getBusinessWithSources(businessId), getLatestWebsiteAudit(businessId)]);
  if (!data) throw new Error("İşletme bulunamadı.");

  const { business, sources } = data;
  const mapsSource = sources.find((s) => s.provider === "google_maps");

  let details: PlaceDetails | null = null;
  let warning: string | null = null;
  if (mapsSource?.external_id) {
    try {
      details = await fetchPlaceDetails(mapsSource.external_id);
    } catch (error: unknown) {
      warning = `Saatler ve yorumlar alınamadı: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  const prompt = buildDemoPrompt({
    business,
    templateId,
    slug,
    mapsUrl: mapsSource?.source_url || business.google_maps_url || null,
    angle: pickAngle({ ...business, audit }),
    details,
  });
  return { prompt, warning };
}

/** A new slug means a new demo: its creation date restarts and the sent date clears. */
export async function saveDemo(
  businessId: string,
  template: string,
  slug: string,
  url: string
): Promise<DemoFields> {
  const { data: current, error: readError } = await supabaseAdmin
    .from("businesses")
    .select("demo_slug, demo_created_at")
    .eq("id", businessId)
    .single();
  if (readError) throw new Error(readError.message);

  const isNewDemo = current.demo_slug !== slug || !current.demo_created_at;
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .update({
      demo_template: template,
      demo_slug: slug,
      demo_url: url,
      ...(isNewDemo && { demo_created_at: new Date().toISOString(), demo_sent_at: null }),
    })
    .eq("id", businessId)
    .select("demo_template, demo_slug, demo_url, demo_created_at, demo_sent_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function markDemoSent(businessId: string, url: string): Promise<string> {
  const sentAt = new Date().toISOString();
  const [updateRes, insertRes] = await Promise.all([
    supabaseAdmin.from("businesses").update({ demo_sent_at: sentAt }).eq("id", businessId),
    supabaseAdmin.from("lead_activities").insert({
      business_id: businessId,
      type: "note",
      content: `Demo gönderildi: ${url}`,
    }),
  ]);
  const error = updateRes.error || insertRes.error;
  if (error) throw new Error(error.message);
  return sentAt;
}
