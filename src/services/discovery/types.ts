import { Business, DiscoveryProvider } from "@/types/business";

export interface DiscoveryQuery {
  location: string;
  district?: string;
  sector: string;
  sources: DiscoveryProvider[];
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
  created_at: string;
  completed_at: string | null;
}

export interface DiscoveredLeadItem {
  business: Business;
  isNew: boolean;
  matchedBy?: string;
  provider: DiscoveryProvider;
}

export interface DiscoveryExecutionResult {
  search: SearchRecord;
  items: DiscoveredLeadItem[];
}
