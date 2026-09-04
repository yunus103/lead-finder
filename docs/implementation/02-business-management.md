# Step 02 — Business Management

**Phase:** 02 — Business Management  
**Status:** TODO

## Objective

Implement the core business management foundation of the application.

A business discovered from any source should be stored as a single canonical record and remain manageable throughout the rest of the workflow.

## Agent Tasks

- Implement the `Business` entity based on `SPEC.md`.
- Store core business information such as name, category, location, phone, website, Instagram and other relevant contact information.
- Support relationships between a business and its discovery sources.
- Implement the deduplication/identity logic defined in `SPEC.md`.
- Ensure the same business discovered from different sources can be associated with one canonical record.
- Implement basic business/lead listing and detail views.
- Support updating business information as new information is discovered.
- Keep source-specific data separate from canonical business data where appropriate.

The agent should determine the exact schema, indexes, constraints and implementation details based on the existing project architecture.

Do not implement discovery providers, website analysis, scoring or CRM workflows yet.

## Acceptance Criteria

- Businesses can be created, retrieved and updated.
- A business can have information from multiple sources.
- Duplicate businesses are avoided when identity can be determined reliably.
- Existing businesses can be enriched without creating unnecessary duplicates.
- Businesses can be viewed through the application.
- The resulting structure is ready for the Discovery phase.

## Verification

- Create and retrieve a business.
- Update its information.
- Associate information from multiple sources.
- Test duplicate/identity scenarios.
- Verify the relevant database constraints and indexes.
- Run the project's standard checks.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Update this document with any important implementation decisions.
3. Update `/IMPLEMENTATION.md`.
4. Record significant architectural decisions in `/docs/architecture/decisions.md`.
5. Clearly report any remaining human action.