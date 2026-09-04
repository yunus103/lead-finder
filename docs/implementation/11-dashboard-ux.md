# Step 11 — Dashboard & UX

**Phase:** 11 — Dashboard & UX  
**Status:** TODO

## Objective

Make the application practical and efficient for daily lead-generation and sales work.

## Agent Tasks

- Implement the main dashboard with useful operational metrics:
  - total leads
  - new leads
  - leads to call
  - follow-ups
  - meetings
  - proposals
  - won leads
  - high-priority leads
- Improve discovery results for reviewing large result sets.
- Implement useful bulk actions such as:
  - save
  - assign to list
  - change status
  - exclude
- Ensure the main navigation and application structure are clear.
- Review the complete workflow for:
  - loading states
  - empty states
  - error states
  - responsive behavior
  - accessibility
  - visual consistency
- Fix obvious UX problems discovered during the review.

Prioritize speed and clarity over visual polish or unnecessary features.

## Acceptance Criteria

- Dashboard metrics accurately reflect application data.
- Discovery results are practical to review and process.
- Bulk actions work correctly.
- Main workflows are clear and consistent.
- The application works well on the intended screen sizes.
- No unnecessary features are introduced.

## Verification

Test the complete workflow:

**Discover → Review → Qualify → Organize → Call → Follow Up**

Also test empty, loading and error states across the main screens.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Review the application as a daily user.
3. Fix only issues that materially affect usability.
4. Update this document with important implementation decisions.
5. Update `/IMPLEMENTATION.md`.
6. Record significant architectural decisions if necessary.