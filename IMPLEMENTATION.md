# IMPLEMENTATION.md

## Purpose

This document is the master implementation roadmap for the project.

It answers:

- Where are we?
- What has been completed?
- What is being implemented now?
- What comes next?
- Which document should be read for the current step?

It does **not** contain detailed implementation instructions.

---

## Documentation Hierarchy

Each document has one responsibility:

| Document | Responsibility |
|---|---|
| `SPEC.md` | What the product should do and why |
| `IMPLEMENTATION.md` | Implementation roadmap and current state |
| `/docs/implementation/` | Detailed instructions for each implementation step |
| `/.agents/rules/` | Agent behavior and operating rules |
| `/docs/architecture/decisions.md` | Important architectural decisions and rationale |

Do not duplicate detailed information across documents.

---

## Current State

**Status:** In Progress
 
**Current Phase:** Phase 08 — Calling Queue
 
**Current Step:** Step 08 — Calling Queue
 
**Next Document:**
 
`/docs/implementation/08-calling-queue.md`

---

# Implementation Phases

## 01 — Foundation

Project setup, environment, database connection, base application structure, and development foundation.

## 02 — Business Management

Business entity, persistence, source relationships, deduplication foundations, and basic lead management.

## 03 — Discovery Infrastructure

Unified discovery architecture, provider abstraction, normalized results, search persistence, and discovery workflow.

## 04 — Google Maps Discovery

Google Places integration, business discovery, normalization, deduplication, and search history.

## 05 — Website Intelligence

Website detection, lightweight website scanning, website status, and audit data.

## 06 — Lead Scoring

Rule-based lead scoring, score calculation, reasons, and lead prioritization.

## 07 — CRM

Lead statuses, contact tracking, notes, interactions, and activity history.

## 08 — Calling Queue

Prioritized calling workflow, follow-ups, call actions, and next-lead flow.

## 09 — Search Provider

Google Search discovery and enrichment integration.

## 10 — Instagram Provider

Instagram discovery and enrichment integration using the selected compliant provider/method.

## 11 — Dashboard & UX

Dashboard metrics, discovery results UX, bulk actions, lists, and overall usability polish.

## 12 — V1 Validation & Release

End-to-end validation, bug fixing, configuration review, documentation review, and V1 release readiness.

---

# Dependencies

Critical path:

`01 Foundation`
→ `02 Business Management`
→ `03 Discovery Infrastructure`
→ `04 Google Maps`
→ `05 Website Intelligence`
→ `06 Lead Scoring`
→ `07 CRM`
→ `08 Calling Queue`

Search and Instagram depend primarily on the discovery infrastructure and can proceed after the core discovery workflow is stable.

---

# Status Model

Each implementation step uses one of:

- `TODO`
- `IN_PROGRESS`
- `BLOCKED`
- `COMPLETE`

Normally, only one step should be `IN_PROGRESS`.

---

# Agent Workflow

For a normal implementation task:

1. Read `/.agents/rules/`.
2. Read this file to identify the current step.
3. Read the current step document.
4. Inspect the relevant code.
5. Implement and verify the step.

Do **not** automatically read every documentation file.

Read `SPEC.md` when product behavior, scope, requirements, or ambiguity requires it.

Read `decisions.md` when an architectural decision is relevant.

---

# Human & Agent Responsibilities

The agent handles implementation, testing, and technical verification.

Human-only actions such as account creation, API keys, billing configuration, or external dashboard setup are defined in the relevant step document.

Credentials must never be committed to the repository.

---

# Scope Changes

If product scope changes:

`SPEC.md` → implementation plan → implementation

Do not silently change product behavior during implementation.

---

# Architecture Decisions

Important architectural decisions and their rationale belong in:

`/docs/architecture/decisions.md`

Do not create a decision record for trivial implementation choices.

---

# Step Completion

A step is complete only when its acceptance criteria are verified.

After completion:

1. Update the step document.
2. Update this file.
3. Mark the step `COMPLETE`.
4. Set the next step to `IN_PROGRESS` only when implementation actually begins.
5. Record important architectural decisions if any were made.

---

# Definition of V1 Complete

V1 is complete when:

- All planned V1 phases are implemented.
- Core discovery → enrichment → scoring → CRM → calling workflow works end-to-end.
- Maps, Search, and Instagram providers are integrated.
- Required human configuration is complete.
- Critical bugs are resolved.
- Acceptance criteria for all implementation steps are verified.
- Documentation reflects the actual system.

---

# Current Next Step

**Phase 07 — CRM**

**Step 07 — CRM**

Detailed instructions:

`/docs/implementation/07-crm.md`