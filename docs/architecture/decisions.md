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