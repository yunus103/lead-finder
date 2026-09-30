export type WebsiteStatus = "UNKNOWN" | "NO_WEBSITE" | "HAS_WEBSITE" | "UNREACHABLE";
export type DiscoveryProvider = "google_maps" | "google_search" | "instagram" | "manual";

export interface Business {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  phone_normalized: string | null;
  website: string | null;
  website_domain: string | null;
  instagram: string | null;
  instagram_normalized: string | null;
  rating: number | null;
  review_count: number;
  website_status: WebsiteStatus;
  crm_status: string;
  lead_score: number;
  priority: string;
  is_excluded: boolean;
  exclusion_reason?: string | null;
  contact_attempts?: number;
  last_contacted_at?: string | null;
  next_follow_up_at?: string | null;
  notes?: string | null;
  google_maps_url?: string | null;
  score_reasons?: import("./scoring").ScoreReason[];
  last_scanned_at?: string | null;
  demo_template?: string | null;
  demo_slug?: string | null;
  demo_url?: string | null;
  demo_created_at?: string | null;
  demo_sent_at?: string | null;
  demo_view_count?: number;
  demo_last_viewed_at?: string | null;
  demo_deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessSource {
  id: string;
  business_id: string;
  provider: DiscoveryProvider;
  external_id: string | null;
  source_url: string | null;
  raw_data: Record<string, unknown>;
  fetched_at: string;
  created_at: string;
}

export interface IngestBusinessInput {
  name: string;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  rating?: number | null;
  review_count?: number;
  provider: DiscoveryProvider;
  external_id?: string | null; // e.g. Google Place ID
  source_url?: string | null;
  raw_data?: Record<string, unknown>;
  lead_score?: number;
  priority?: string;
  score_reasons?: Array<{ label: string; points: number; type: "positive" | "negative"; category: string }> | import("./scoring").ScoreReason[];
  website_status?: WebsiteStatus;
}

export type DeduplicationMatchReason =
  | "google_place_id"
  | "phone"
  | "website_domain"
  | "instagram"
  | "name_and_location";

export interface IngestResult {
  business: Business;
  isNew: boolean;
  matchedBy?: DeduplicationMatchReason;
}
