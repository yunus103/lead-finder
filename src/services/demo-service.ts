import { supabaseAdmin } from "@/lib/supabase";
import { buildDemoPrompt } from "@/lib/demo-prompt";
import { pickAngle } from "@/lib/outreach";
import { getBusinessWithSources } from "./business-service";
import { getLatestWebsiteAudit } from "./website-service";
import { fetchPlaceDetails, PlaceDetails } from "./discovery/providers/google-maps-provider";
import { DemoAction, DemoView } from "@/types/demo";

export type DemoFields = {
  demo_template: string | null;
  demo_slug: string | null;
  demo_url: string | null;
  demo_created_at: string | null;
  demo_sent_at: string | null;
  demo_view_count: number;
  demo_last_viewed_at: string | null;
  demo_deleted_at: string | null;
};

const DEMO_FIELDS =
  "demo_template, demo_slug, demo_url, demo_created_at, demo_sent_at, demo_view_count, demo_last_viewed_at, demo_deleted_at";

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

/** A new slug means a new demo: its dates and view counters restart. */
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
      demo_deleted_at: null,
      ...(isNewDemo && {
        demo_created_at: new Date().toISOString(),
        demo_sent_at: null,
        demo_view_count: 0,
        demo_last_viewed_at: null,
      }),
    })
    .eq("id", businessId)
    .select(DEMO_FIELDS)
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

/** Marks demos removed from yaytech-demos. Slugs no lead points to are ignored. */
export async function markDemosDeleted(slugs: string[]): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .update({ demo_deleted_at: new Date().toISOString() })
    .in("demo_slug", slugs)
    .is("demo_deleted_at", null)
    .select("id");
  if (error) throw new Error(error.message);
  return data.length;
}

export async function getDemoViews(businessId: string, slug: string): Promise<DemoView[]> {
  const { data, error } = await supabaseAdmin
    .from("demo_views")
    .select("*")
    .eq("business_id", businessId)
    .eq("slug", slug)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data;
}

export type DemoViewEvent =
  | { type: "open"; id: string; slug: string; visitorId: string | null; referrer: string | null;
      city: string | null; region: string | null; country: string | null; device: string; os: string; browser: string }
  | { type: "end"; id: string; slug: string; durationSeconds: number; maxScroll: number }
  | { type: "action"; id: string; slug: string; action: DemoAction };

/** Views of slugs no live lead points to (not yet saved, or deleted) are dropped. */
export async function recordDemoView(event: DemoViewEvent): Promise<void> {
  if (event.type === "open") {
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("demo_slug", event.slug)
      .is("demo_deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (!business) return;

    const { error } = await supabaseAdmin.from("demo_views").insert({
      id: event.id,
      business_id: business.id,
      slug: event.slug,
      visitor_id: event.visitorId,
      referrer: event.referrer,
      city: event.city,
      region: event.region,
      country: event.country,
      device: event.device,
      os: event.os,
      browser: event.browser,
    });
    // A replayed beacon hits the primary key; that is not an error worth surfacing.
    if (error && error.code !== "23505") throw new Error(error.message);
    return;
  }

  if (event.type === "end") {
    const { error } = await supabaseAdmin
      .from("demo_views")
      .update({ duration_seconds: event.durationSeconds, max_scroll: event.maxScroll })
      .eq("id", event.id)
      .eq("slug", event.slug);
    if (error) throw new Error(error.message);
    return;
  }

  const { data: view } = await supabaseAdmin
    .from("demo_views")
    .select("actions")
    .eq("id", event.id)
    .eq("slug", event.slug)
    .maybeSingle();
  if (!view || view.actions.includes(event.action)) return;

  const { error } = await supabaseAdmin
    .from("demo_views")
    .update({ actions: [...view.actions, event.action] })
    .eq("id", event.id);
  if (error) throw new Error(error.message);
}
