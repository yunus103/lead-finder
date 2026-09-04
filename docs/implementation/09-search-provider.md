# Step 09 — Search Provider

**Phase:** 09 — Search Provider  
**Status:** TODO

## Objective

Add Google Search as a discovery and enrichment source within the existing discovery infrastructure.

## Agent Tasks

- Implement a Search provider using an appropriate compliant search mechanism.
- Connect it to the existing discovery workflow from Step 03.
- Support relevant business discovery queries.
- Support enriching existing businesses with information found through Search.
- Normalize results into the existing business/source model.
- Reuse the existing identity and deduplication logic.
- Handle empty results, provider errors and usage limitations appropriately.
- Keep Search-specific implementation isolated from the rest of the discovery system.

The agent should determine the appropriate provider/API and technical implementation based on current availability and project requirements.

Do not rebuild the discovery infrastructure.

## Human Action Required

**Owner:** Yunus

Provide any required external API/provider account, credentials or configuration.

Credentials must not be committed to the repository.

## Acceptance Criteria

- Search can be selected as a discovery source.
- Search results enter the existing discovery workflow.
- Existing businesses can be enriched without unnecessary duplicates.
- Search-specific failures do not break other providers.
- Search results remain traceable to their source.

## Verification

- Run relevant business searches.
- Verify normalization and persistence.
- Test enrichment of an existing business.
- Test duplicate handling.
- Test empty/error responses.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Confirm external provider configuration is working.
3. Update this document with important implementation decisions.
4. Update `/IMPLEMENTATION.md`.
5. Record significant architectural decisions if necessary.