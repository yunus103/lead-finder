# Architecture Decisions

This document records significant architectural decisions that affect the structure or long-term direction of the project.

Only decisions worth remembering should be recorded. Do not document routine implementation choices.

---

## Decision Format

### Progressive Deduplication & Canonical Business Model

**Status:** Accepted  
**Date:** 2026-09-04

**Decision:**  
Use a single canonical `businesses` table representing the unified entity, linked 1-to-many with `business_sources` records for each provider discovery/enrichment event. Deduplication executes progressively: Google Place ID → normalized phone → website root domain → Instagram handle → normalized name + city. Automated enrichment fills empty canonical attributes without overwriting user-managed CRM fields.

**Reason:**  
Prevents duplicate records across Google Maps, Search, and Instagram discoveries, maintains complete source lineage, and guarantees automated syncs never destroy human sales notes or statuses.

**Alternatives:**  
- Provider-isolated tables: Causes fragmented records and duplicate outreach.
- Fuzzy name matching without anchor signals: High false-positive error rate erroneously merging separate businesses.

---

### Pluggable Discovery Registry & Unified Query Model

**Status:** Accepted  
**Date:** 2026-09-04

**Decision:**  
All discovery providers (Google Maps, Google Search, Instagram) must implement the `IDiscoveryProvider` contract and register in `providerRegistry`. The discovery orchestrator coordinates multi-provider querying, feeds raw leads through progressive deduplication into the canonical `businesses` table, records execution metrics in `searches`, and links individual results in `search_results`.

**Reason:**  
Keeps provider implementations strictly decoupled from core business storage and CRM workflows. Adding, swapping, or upgrading a discovery provider never requires restructuring core business logic or the UI.

**Alternatives:**  
- Direct, provider-specific search controllers: Couples provider quirks directly to UI and database operations.

---

### Google Places API (New) FieldMask & Quota Optimization

**Status:** Accepted  
**Date:** 2026-09-04

**Decision:**  
Integrate the modern Google Places API (New) `places:searchText` endpoint using an explicit, minimal `X-Goog-FieldMask` containing only essential lead attributes (`places.id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,googleMapsUri`).

**Reason:**  
Google Places API (New) prices requests based on requested fields. Excluding high-cost fields (photos, long reviews, opening hours) guarantees discovery operations stay within Google's lowest cost tier and fit comfortably within the monthly \$200 recurring free credit.

**Alternatives:**  
- Legacy Places API: Deprecated by Google and lacks granular FieldMask cost control.
- Requesting wildcard `*` fields: Results in maximum per-request billing rate.