import { Business, DiscoveryProvider } from "@/types/business";

export interface DiscoveryQuery {
  location: string;
  district?: string;
  sector: string;
  sources: DiscoveryProvider[];
  limit?: number; // e.g. 20, 40, 60
}

export interface RawDiscoveredLead {
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
  external_id?: string | null;
  source_url?: string | null;
  raw_data?: Record<string, unknown>;
}

export interface IDiscoveryProvider {
  readonly name: DiscoveryProvider;
  discover(params: {
    location: string;
    district?: string;
    sector: string;
    limit?: number;
  }): Promise<RawDiscoveredLead[]>;
}

export interface SearchRecord {
  id: string;
  location: string;
  district: string | null;
  sector: string;
  sources: string[];
  status: "pending" | "processing" | "completed" | "failed";
  raw_count: number;
  unique_count: number;
  new_count: number;
  existing_count: number;
  error_message: string | null;
  raw_results?: DiscoveredCandidateLead[];
  created_at: string;
  completed_at: string | null;
}

export interface DiscoveredCandidateLead {
  tempId: string;
  name: string;
  category: string;
  address: string | null;
  city: string;
  district: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  rating: number | null;
  review_count: number;
  external_id: string | null;
  source_url: string | null;
  provider: DiscoveryProvider;

  // Pre-calculated scoring & audit signals
  lead_score: number;
  priority: "HOT" | "WARM" | "COLD" | "LOW";
  score_reasons: Array<{ label: string; points: number; type: "positive" | "negative"; category: string }>;
  website_status: "HAS_WEBSITE" | "NO_WEBSITE" | "UNREACHABLE" | "UNKNOWN";

  // Quick audit details
  audit_preview?: {
    is_https: boolean;
    has_viewport: boolean;
    has_whatsapp: boolean;
    response_time_ms: number;
  } | null;

  // DB status check
  already_saved: boolean;
  existing_business_id?: string;
  raw_data?: Record<string, unknown>;
}

export interface DiscoveryPreviewResult {
  search: SearchRecord;
  items: DiscoveredCandidateLead[];
}

