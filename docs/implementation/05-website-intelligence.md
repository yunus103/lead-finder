# Step 05 — Website Intelligence

**Phase:** 05 — Website Intelligence  
**Status:** COMPLETE

## Objective

Analyze a business's website to identify useful signals for lead qualification and scoring.

The system should provide a fast lightweight scan for discovered businesses and a deeper audit only when explicitly requested.

## Agent Tasks

- Detect and normalize website URLs.
- Determine basic website status:
  - `UNKNOWN`
  - `NO_WEBSITE`
  - `HAS_WEBSITE`
  - `UNREACHABLE`
- Implement lightweight website analysis suitable for processing many leads.
- Collect useful signals where practical, including:
  - HTTPS
  - reachability
  - page title
  - meta description
  - H1
  - viewport/mobile signals
  - basic response timing
  - robots/sitemap
  - contact information
  - social links
  - basic technology information
- Persist lightweight analysis results.
- Implement a manual deep-audit action for selected businesses.
- Store deeper audit results separately where appropriate.
- Handle timeouts, invalid URLs and inaccessible websites without breaking the workflow.

The agent should choose appropriate technical tools and implementation details.

Do not turn this into a full website auditing platform.

## Acceptance Criteria

- [x] Businesses without websites can be identified (`NO_WEBSITE`).
- [x] Existing websites can be checked reliably.
- [x] Lightweight analysis produces useful lead-quality signals (HTTPS, response time, title, H1, viewport, CMS tech, social links, contact info).
- [x] Results are persisted in `website_audits` and visible on the relevant business/lead (`/leads/[id]`).
- [x] Deep audits can be manually triggered with heading breakdown, missing alt counts, security headers, and pitch opportunities.
- [x] Website failures (timeouts, SSL errors, unreachable) do not break discovery or the rest of the application.
- [x] Lightweight scanning is efficient enough for batches of leads (chunked concurrency of 5 with 5s timeout).

## Verification

- Tested businesses with no website -> status set to `NO_WEBSITE`.
- Tested valid and invalid URLs -> handled gracefully without crashing.
- Tested HTTPS and non-HTTPS fallback -> captured accurately.
- Tested unreachable/timeout scenarios -> mapped to `timeout` / `unreachable` with status `UNREACHABLE`.
- Verified lightweight results are persisted in `website_audits` and linked to `businesses`.
- Verified manual deep audit action and pitch opportunities generation.

## Implementation Details & Key Decisions

1. **Parser Strategy**: Used `cheerio` for server-side HTML parsing to reliably inspect DOM elements and attributes across malformed websites without heavy browser dependencies (Puppeteer/Chromium).
2. **Resource Throttling**: Limited HTML body ingestion to 500 KB and enforced `AbortSignal.timeout(5000)` per scan.
3. **Discovery Batching**: Implemented controlled concurrency batches of 5 in `executeDiscovery` using `Promise.allSettled` to scan newly discovered leads with websites without slowing down discovery or blowing connection pools.
4. **CRM Contact Enrichment**: Extracted emails, phones, and Instagram handles automatically enrich empty canonical attributes on the business entity.
5. **Pitch Opportunities**: Deep audits generate actionable Turkish pitch bullets (e.g. missing H1, unoptimized WordPress, missing meta description, no mobile viewport) for calling pitches.