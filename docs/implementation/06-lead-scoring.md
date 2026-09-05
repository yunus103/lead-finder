# Step 06 — Lead Scoring

**Phase:** 06 — Lead Scoring  
**Status:** COMPLETE

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

- [x] A business can receive a deterministic lead score (0–100).
- [x] The same input produces the same score.
- [x] The score can be recalculated (per lead and bulk).
- [x] Users can understand why a lead received its score (`score_reasons` explainability checklist).
- [x] Higher-value leads can be prioritized for outreach (`lead_score DESC` default sorting, priority tabs).
- [x] Scoring rules can be changed without restructuring the system (`SCORING_WEIGHTS` in `src/services/scoring/lead-scorer.ts`).
- [x] No AI/ML involved.

## Verification

- Tested businesses with different combinations of signals (verified 47 existing database leads).
- Top leads scored 85 (HOT) having no website, high reviews (>100), high rating (>=4.5), and phone number.
- Verified single-lead recalculation and bulk database recalculation.
- Verified explainability reasons in UI and database.
- Confirmed purely deterministic rule-based calculation.

## Implementation Details & Key Decisions

1. **Centralized Weights Configuration**: All points are defined in `SCORING_WEIGHTS` in `src/services/scoring/lead-scorer.ts`. Modifying a point value automatically affects all future evaluations without schema or code changes.
2. **Explainability Storage**: Added `score_reasons` JSONB column to `businesses` to persist granular positive and negative signals with points.
3. **Automated Lifecycle Recalculation**: Scores are calculated upon business ingestion in `ingestBusiness` and refreshed whenever a lightweight scan or deep audit completes in `website-service.ts`.
4. **UI Prioritization**: Default table sorting is set to `lead_score DESC` with priority tabs (`HOT`, `WARM`, `COLD`, `LOW`) on `/leads`, and an explainable gauge card on `/leads/[id]`.