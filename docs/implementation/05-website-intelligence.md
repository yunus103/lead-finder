# Step 05 — Website Intelligence

**Phase:** 05 — Website Intelligence  
**Status:** TODO

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

- Businesses without websites can be identified.
- Existing websites can be checked reliably.
- Lightweight analysis produces useful lead-quality signals.
- Results are persisted and visible on the relevant business/lead.
- Deep audits can be manually triggered.
- Website failures do not break discovery or the rest of the application.
- Lightweight scanning is efficient enough for batches of leads.

## Verification

- Test businesses with no website.
- Test valid and invalid URLs.
- Test HTTPS and non-HTTPS sites where applicable.
- Test unreachable/timeout scenarios.
- Verify lightweight results are persisted.
- Run a manual deep audit and verify its results.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Check that scans do not unnecessarily consume resources.
3. Update this document with important implementation decisions.
4. Update `/IMPLEMENTATION.md`.
5. Record significant architectural decisions if necessary.