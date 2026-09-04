# Step 07 — CRM

**Phase:** 07 — CRM  
**Status:** TODO

## Objective

Implement the core CRM workflow for managing leads, outreach, follow-ups and sales progress.

## Agent Tasks

- Implement the lead lifecycle and statuses defined in `SPEC.md`.
- Allow users to change a lead's status.
- Implement contact tracking:
  - contact attempts
  - last contacted date
  - next follow-up date
  - notes
- Implement interaction/activity records and a chronological activity timeline.
- Build the lead detail view containing the information needed to evaluate and work a lead:
  - business information
  - contact information
  - discovery sources
  - website intelligence
  - score and reasons
  - CRM status
  - interactions
  - notes
  - follow-up information
- Implement lead lists for organizing businesses into outreach groups.
- Allow a business to belong to multiple lists.
- Implement exclusion/ignore functionality for businesses that should not appear in normal outreach workflows.
- Keep CRM behavior simple and focused on actual sales work.

The agent should determine the exact data model, UI structure and implementation details from the existing architecture and `SPEC.md`.

## Acceptance Criteria

- Leads can move through the defined sales lifecycle.
- Contact attempts and follow-ups are persisted.
- Notes and activity history are available on the lead.
- Lead details can be reviewed from one primary workspace.
- Leads can be organized into multiple lists.
- Excluded businesses are kept in the database but excluded from normal workflows.
- CRM data remains connected to the canonical business record.

## Verification

- Create a lead and move it through several statuses.
- Record multiple contact attempts.
- Create and complete a follow-up.
- Add notes and verify the activity timeline.
- Add a lead to multiple lists.
- Exclude a business and verify it no longer appears in normal outreach views.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Test the complete lead lifecycle.
3. Update this document with important implementation decisions.
4. Update `/IMPLEMENTATION.md`.
5. Record significant architectural decisions if necessary.