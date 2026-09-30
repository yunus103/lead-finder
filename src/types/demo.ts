export type DemoAction = "whatsapp" | "call" | "maps" | "instagram";

export interface DemoView {
  id: string;
  business_id: string;
  slug: string;
  visitor_id: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  referrer: string | null;
  duration_seconds: number | null;
  max_scroll: number | null;
  actions: DemoAction[];
  created_at: string;
}
