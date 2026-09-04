# Step 04 — Google Maps Discovery

**Phase:** 04 — Google Maps Discovery  
**Status:** TODO

## Objective

Integrate Google Places API as the first real discovery provider and make Google Maps business discovery usable end-to-end.

## Human Action Required

**Owner:** Yunus

- Create/configure the required Google Cloud project.
- Enable the required Places API.
- Configure billing if required by Google.
- Create the required API credentials.
- Provide the necessary configuration through environment variables.

Credentials must never be committed to the repository.

## Agent Tasks

- Integrate the official Google Places API.
- Connect it to the discovery infrastructure from Step 03.
- Support discovery using location and business category/query.
- Request only the data required by the application to control unnecessary API usage.
- Normalize Google results into the existing business model.
- Use Google's stable business identifier where available for identity/deduplication.
- Persist searches and results.
- Correctly handle new businesses and businesses already in the database.
- Handle API errors, empty results and rate/usage limitations appropriately.
- Provide a usable discovery results interface.

The agent should determine the exact API calls, field selection and implementation details.

## Acceptance Criteria

- A user can search for businesses by location and category/query.
- Real Google Places results are returned.
- Results are stored through the existing discovery workflow.
- Existing businesses are not unnecessarily duplicated.
- Google-specific data is associated with the correct business.
- API errors are handled without breaking the application.
- API usage is limited to what the product actually needs.

## Verification

- Run searches for several business categories and locations.
- Verify new businesses are persisted.
- Repeat a search and verify deduplication.
- Verify search history.
- Test empty results and API failure scenarios.
- Confirm credentials are not exposed or committed.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Confirm the required Google configuration is working.
3. Update this document with important implementation decisions.
4. Update `/IMPLEMENTATION.md`.
5. Record significant architectural decisions if necessary.