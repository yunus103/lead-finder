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

---

### Cheerio-Based Lightweight & Deep Website Intelligence Architecture

**Status:** Accepted  
**Date:** 2026-09-04

**Decision:**  
Implement website intelligence using Node's native `fetch` combined with `cheerio` for server-side HTML parsing, strictly rejecting headless browsers (Puppeteer/Chromium/Playwright). Lightweight scans are throttled with a 5000ms timeout and a 500 KB response ceiling, executing automatically for newly discovered leads in bounded concurrency batches (5 parallel promises). On-demand deep audits assess heading hierarchy, missing image alt tags, and HTTP security headers, translating technical deficiencies into deterministic sales pitch opportunity flags.

**Reason:**  
Headless browsers introduce massive memory footprints, slow crawl times (5–15s per lead), complex binary dependencies, and fragile runtime environments. Native `fetch` + `cheerio` processes pages in 150–400ms, consumes negligible CPU/RAM, and reliably extracts all signals required to qualify leads without delaying discovery.

**Alternatives:**  
- Headless Chromium (Puppeteer/Playwright): Excluded per SPEC Section 15 due to excessive resource consumption and latency during batch processing.
- Pure RegEx parsing: Fragile when handling arbitrary malformed real-world HTML, nested elements, or multi-line attribute strings.

---

### Deterministic Explainable Lead Scoring Engine

**Status:** Accepted  
**Date:** 2026-09-05

**Decision:**  
Scoring is executed through a centralized, pure deterministic function (`calculateLeadScore`) using explicitly weighted rules across three pillars: website opportunity (max 40 pts), commercial reputation (max 35 pts), and reachability (max 25 pts). Scores clamp to 0–100 and map to operational priority tiers (`HOT` 80–100, `WARM` 60–79, `COLD` 40–59, `LOW` 0–39). Every evaluation generates and persists granular human-readable contributing factors in `businesses.score_reasons` (`JSONB`). AI and machine-learning models are strictly prohibited.

**Reason:**  
Pure rule-based scoring is 100% reproducible, fast (executes in microseconds without network latency), requires zero API cost, and provides complete sales transparency ("Why this lead?") so the salesperson knows exactly what pain point to pitch before dialing.

**Alternatives:**  
- LLM / AI scoring prompts: Excluded per SPEC Section 17 due to non-deterministic outputs, API latency during batch discovery, token costs, and black-box unexplainability.
- Static manual tagging: Requires human review for thousands of leads, defeating the purpose of automated prioritization.

---

### Sandbox Discovery, Upfront Scoring & Selective CRM Ingestion

**Status:** Accepted  
**Date:** 2026-09-05

**Decision:**  
Discovery operations execute within an ephemeral in-memory sandbox without writing to the database. Discovered places from Google Places (New) are pre-scored and lightweight-audited in memory, filtered against negative institutional terms (`devlet`, `üniversite`, `fakülte`, etc.), and presented with checkboxes (checked by default). Users selectively commit approved prospects into the permanent `businesses` table via fast batch CRUD (<100ms). Full deep audits and pitch script generation are deferred to on-demand execution when opening the lead detail page (`/leads/[id]`). Candidate results are archived in `searches.raw_results` (`JSONB`) to enable instant search replays without repeating paid Google API queries.

**Reason:**  
Prevents database bloat from franchise chains, government facilities, or non-viable businesses. Keeps batch saving instant (<100ms) by avoiding sequential external HTTP audit requests. Allows full search replay via `searches.raw_results` without consuming Google API quota.

**Alternatives:**  
- Auto-saving all discovery leads directly to the database: Causes CRM pollution with hundreds of irrelevant entities.
- Running deep live HTTP audits sequentially during batch saving: Blocks the UI for 20–30 seconds.

---

### High-Velocity Cold-Calling Cockpit & Lean CRM Data Model

**Status:** Accepted  
**Date:** 2026-09-05

**Decision:**  
Structure the CRM around a single-operator cold-calling cockpit rather than a multi-tier SaaS CRM. Replace multi-table relational list management (`lead_lists` + `lead_list_members`) with direct operational status filters and indexed query dimensions. Automate status transitions through 1-click call outcome triggers (`Cevap Yok`, `Geri Ara`, `İlgilendi`, `Toplantı`, `Red`, `Dışla`) that update `businesses.crm_status`, increment `contact_attempts`, timestamp `last_contacted_at`, and record an event in `lead_activities`. Integrate rapid follow-up scheduling presets (`+2h`, `Yarın 10:00`, `Pazartesi 10:00`), 1-click tailored WhatsApp pitch launching, and a "Save & Next Lead" continuous dialer mechanic.

**Reason:**  
For solo cold-calling, manual 10-status dropdowns, modal navigation, and complex list management introduce excessive friction that degrades call velocity. Automating status transitions and persisting interactions in a single `lead_activities` table maintains chronological audit history without operational overhead.

**Alternatives:**  
- Full relational list architecture: Adds unnecessary join tables and CRUD interfaces that don't add value for a solo operator.
- Manual dropdown-driven status management: Requires 3-4 clicks per call attempt, slowing down high-volume calling sessions.

---

### Deferral of Automated Search & Instagram Providers in Favor of Google Maps & Lightweight Link Enrichment

**Status:** Accepted  
**Date:** 2026-09-05

**Decision:**  
Defer separate programmatic discovery and scraping providers for Google Search (Phase 09) and Instagram (Phase 10). Google Places API (New) serves as the primary discovery engine providing high-quality, structured local business data (names, verified phones, addresses, ratings, websites, and direct Maps URLs) with zero bot-detection fragility. Social media handles (such as Instagram) discovered during website intelligence scans or available from Google Maps are enriched directly into canonical business records. Direct links (`[ 📍 Haritalarda Gör ↗ ]`, Instagram URL) are surfaced in the calling cockpit for fast human verification prior to dialing.

**Reason:**  
For Turkish local business prospecting and solo cold-calling, Google Maps represents 95%+ of active local commerce. Automated Google Search and Instagram scraping introduces severe anti-bot challenges (CAPTCHAs, login walls, IP bans), high latency, and unstructured noise. A solo operator gains significantly higher conversion velocity by calling structured Google Maps leads directly rather than investing development and maintenance time into brittle scraping pipelines.

**Alternatives:**  
- Third-party SERP & Social APIs (e.g. SerpAPI, Apify): Adds recurring subscription overhead and per-request costs without materially improving local lead reach or phone accuracy.
- Custom Headless Scrapers (Puppeteer/Playwright): Excluded due to resource footprint, maintenance burden, and aggressive bot mitigation.