# Step 08 — Calling Queue

**Phase:** 08 — Calling Queue  
**Status:** TODO

## Objective

Create a focused workflow for calling high-priority leads and recording the result of each outreach attempt.

## Agent Tasks

- Build a calling queue from existing CRM data.
- Prioritize leads using:
  1. lead score
  2. actionable calling status
  3. due follow-ups
  4. age of untouched leads
- Show the key information needed before making a call:
  - business name
  - phone
  - lead score
  - why the lead is valuable
  - relevant website/contact information
- Provide quick actions such as:
  - Call
  - No Answer
  - Contacted
  - Interested
  - Not Interested
  - Follow Up
  - Skip
- Connect actions to the existing CRM and activity system.
- Make it possible to move quickly to the next lead.

Do not duplicate CRM functionality that already exists in Step 07.

## Acceptance Criteria

- The queue contains actionable leads.
- Leads are ordered by a predictable priority.
- Key lead information is visible without unnecessary navigation.
- Outreach actions correctly update CRM data.
- Follow-ups appear when due.
- The user can efficiently work through the queue.

## Verification

- Create leads with different scores and statuses.
- Verify queue ordering.
- Test each relevant call action.
- Verify activity and CRM updates.
- Verify follow-up behavior.
- Confirm excluded/irrelevant leads do not enter the queue.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Test the complete call → action → next lead workflow.
3. Update this document with important implementation decisions.
4. Update `/IMPLEMENTATION.md`.
5. Record significant architectural decisions if necessary.