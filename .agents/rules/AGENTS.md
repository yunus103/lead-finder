# Project Rules

- Follow `SPEC.md` for product scope and behavior.
- Follow `IMPLEMENTATION.md` for the current step and overall roadmap.
- Read `SPEC.md` when requirements, product behavior, scope, or acceptance criteria are unclear or need clarification.
- Read the current step document before starting work on that step.
- Read `docs/architecture/decisions.md` when making or changing a significant architectural decision.
- Work only on the current implementation step. Do not implement future steps or unrelated improvements.
- Read only the documentation and code relevant to the current task.
- Reuse existing project patterns and working infrastructure before introducing something new.
- Keep provider-specific logic isolated from shared discovery infrastructure.
- Keep business logic separate from UI concerns.
- Record significant architectural decisions in `docs/architecture/decisions.md`.
- When a step is complete, update its status and `IMPLEMENTATION.md`.
- If a required external action needs the user (API setup, billing, credentials, deployment, etc.), stop and clearly report it instead of assuming it is done.
- If requirements conflict, stop and ask rather than guessing.