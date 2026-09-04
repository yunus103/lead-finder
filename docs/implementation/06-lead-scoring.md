# Step 06 — Lead Scoring

**Phase:** 06 — Lead Scoring  
**Status:** TODO

## Objective

Implement a simple, deterministic scoring system that identifies which businesses are the best sales opportunities.

## Agent Tasks

- Implement rule-based lead scoring using the signals defined in `SPEC.md`.
- Include relevant signals such as website quality, website absence, Instagram presence, Google rating/reviews and other available business information.
- Keep scoring rules centralized and easy to modify.
- Store the resulting score.
- Store the reasons/signals that contributed to the score.
- Recalculate the score when relevant business information changes.
- Implement lead priority based on the score and available sales state.

The exact scoring values and technical implementation should be determined during implementation based on the product requirements.

Do not use AI/ML for scoring in V1.

## Acceptance Criteria

- A business can receive a deterministic lead score.
- The same input produces the same score.
- The score can be recalculated.
- Users can understand why a lead received its score.
- Higher-value leads can be prioritized for outreach.
- Scoring rules can be changed without restructuring the system.

## Verification

- Test businesses with different combinations of signals.
- Verify score calculation and recalculation.
- Verify scoring reasons.
- Verify lead priority.
- Confirm no AI-based scoring is involved.

## Completion

Before marking the step `COMPLETE`:

1. Verify the acceptance criteria.
2. Confirm scoring rules are easy to modify.
3. Update this document with important implementation decisions.
4. Update `/IMPLEMENTATION.md`.
5. Record significant architectural decisions if necessary.