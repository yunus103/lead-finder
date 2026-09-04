# Step 03 — Discovery Infrastructure

**Phase:** 03 — Discovery Infrastructure  
**Status:** TODO

## Objective

Establish the shared infrastructure that allows Google Maps, Search and Instagram to work as independent discovery providers within one unified workflow.

## Agent Tasks

- Define a common interface for discovery providers.
- Define a normalized business result structure.
- Implement the flow from discovery request → provider → normalization → business matching → persistence.
- Persist search information and its results.
- Distinguish between:
  - new businesses
  - existing businesses
  - duplicate results
- Keep provider-specific logic isolated.
- Support selecting one or multiple discovery sources.
- Make the system extensible so future providers can be added without restructuring the core workflow.

The agent should determine the appropriate technical architecture based on the existing codebase.

Do not implement Google Maps, Search or Instagram provider-specific integrations in this step.

## Acceptance Criteria

- A discovery provider can be plugged into the common workflow.
- Provider results can be normalized into the business model.
- Existing businesses are correctly identified.
- Discovery results are persisted and traceable to their source/search.
- Multiple providers can use the same workflow.
- Adding a new provider does not require rewriting the core discovery system.

## Verification

- Use a mock/test provider to run a discovery operation.
- Verify normalization and persistence.
- Test new vs. existing business handling.
- Test duplicate results.
- Verify that provider-specific code remains isolated.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Update this document with important implementation decisions.
3. Update `/IMPLEMENTATION.md`.
4. Record significant architectural decisions if necessary.