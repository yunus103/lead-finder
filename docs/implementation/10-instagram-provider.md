# Step 10 — Instagram Provider

**Phase:** 10 — Instagram Provider  
**Status:** DEFERRED

## Status Note
Deferred per architectural decision (`docs/architecture/decisions.md`). Automated Instagram scraping and profile extraction is blocked by strict login walls, IP blocking, and bot mitigation. Organic social handle enrichment during lightweight website scans, combined with direct links to Instagram/Google Maps on the lead cockpit, fulfills operator verification without brittle scraping scrapers.

## Objective

Add Instagram as a discovery and enrichment source for businesses.

## Agent Tasks

- Implement an Instagram provider using a compliant and reliable method.
- Connect it to the existing discovery infrastructure.
- Support discovering relevant business profiles where possible.
- Support enriching existing businesses with Instagram information.
- Normalize usernames/profile information.
- Associate Instagram profiles with businesses using reliable identity signals.
- Reuse the existing deduplication logic.
- Handle unavailable profiles, failed requests and provider limitations gracefully.
- Keep Instagram-specific logic isolated from the core discovery system.

The agent should determine the appropriate provider/API and implementation based on current availability and project requirements.

Do not introduce unreliable scraping or rebuild the discovery infrastructure.

## Human Action Required

**Owner:** Yunus

Provide any required external provider/API account, credentials or configuration.

Credentials must not be committed to the repository.

## Acceptance Criteria

- Instagram can be selected as a discovery/enrichment source.
- Relevant profile information can be associated with businesses.
- Existing businesses are enriched rather than unnecessarily duplicated.
- Provider failures do not affect other discovery sources.
- Instagram-specific implementation remains isolated.

## Verification

- Test discovery/enrichment with relevant businesses.
- Verify profile-to-business matching.
- Test duplicate handling.
- Test unavailable profiles and provider errors.
- Verify source information is persisted correctly.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Confirm external provider configuration is working.
3. Update this document with important implementation decisions.
4. Update `/IMPLEMENTATION.md`.
5. Record significant architectural decisions if necessary.