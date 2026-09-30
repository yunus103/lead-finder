# Handoff — Lead Finder (Yaytech Studio)

Personal tool for finding freelance web-design clients: discover local Turkish businesses via Google Places, scan their websites, score them, and call/WhatsApp them from a CRM + calling queue.

Stack: Next.js 15 App Router (server actions, `force-dynamic` pages), Supabase (Postgres), Tailwind, cheerio, undici. Deployed on Vercel (Hobby). User runs only the deployed version, not dev mode.

## Infrastructure facts (decided, don't revisit)
- Supabase region: **ap-northeast-1 (Tokyo)**. User does **not** want to migrate data.
- Vercel functions pinned to **hnd1 (Tokyo)** via `vercel.json` (dashboard shows "Overridden" — expected). Keeps DB round trips short.
- Consequence: website scans run from Tokyo → raw response times are inflated. Scoring therefore uses a high `SLOW_SERVER_MS = 3000` threshold; real speed comes from Google PageSpeed (on-demand button).
- PageSpeed uses `PAGESPEED_API_KEY`, falling back to `GOOGLE_PLACES_API_KEY` (PageSpeed Insights API must be enabled on the key).
- No Supabase migrations were needed; new audit fields live inside `website_audits.deep_audit_data` JSON.
- Old leads are **not** bulk re-scanned (user's choice). A lead re-scans itself in the background when its detail page is opened and its audit predates the new scanner (no `deep_audit_data.health`).

## What was done in the previous session
**Scanner** (`src/services/website/scanner.ts`) rewritten with undici:
- TLS failure → retry ignoring cert; incomplete chain counts as working (browsers accept it), expired/invalid is flagged as a real "Not secure" issue.
- Reads real error codes (`err.cause.code`), 9s timeout, http fallback, www fallback (only when DNS failed fast).
- `SiteHealth`: `ok | protected (403/429/Cloudflare) | broken (4xx/5xx) | parked (for sale/suspended/empty) | down`.
- Detects copyright year, strict WhatsApp/tel links, Turkish charsets, redirects to social/platform pages.

**Web presence** (`src/lib/web-presence.ts`): Instagram/Facebook/Linktree/Sahibinden/Doktortakvimi/etc. as "website" ⇒ treated as NO_WEBSITE (hottest leads); Instagram link moved to `instagram`.

**Scoring** (`src/services/scoring/lead-scorer.ts`): website opportunity is a gate — a healthy site caps the score at 29 (LOW). Thresholds HOT ≥70, WARM ≥50, COLD ≥30. Mobile phone +15, landline +8, 0850/444 −10, no phone −15, >1000 reviews −10 (chain signal). Closed businesses filtered out at the Google provider (`businessStatus`).

**Shared pure modules** (usable client + server):
- `src/lib/site-analysis.ts` — scan → audit fields, health → website_status, customer-facing problem list.
- `src/lib/outreach.ts` — phone type detection (`getPhoneInfo`), WhatsApp first message + call pitch from one observation. Sender name in `OUTREACH_SENDER` ("Yunus", Yaytech Studio).

**Performance**: parallel queries on detail/queue pages, no live scan blocking render, `loading.tsx` skeletons on all routes, removed `revalidatePath` from client-managed actions, bulk insert on save (~4 queries total), discovery scans with a 10-wide concurrency pool (`src/lib/concurrency.ts`), search history no longer loads `raw_results`.

**CRM / UX**:
- WhatsApp composer (`src/components/whatsapp-composer.tsx`): editable message before opening wa.me, disabled for landline/corporate numbers, logged as `whatsapp` activity, lead → CONTACTED.
- Notes are a persistent notepad (`businesses.notes`), no longer written to the timeline; call outcomes no longer overwrite notes.
- Queue: due follow-ups ignore WON/LOST, every logged call resolves the pending follow-up, "no answer" auto-schedules a retry next day 10:00 TR (max 3 attempts), removed the fallback that looped over worked leads.
- Discovery results: filters (HOT/WARM, mobile only, hide chains, hide saved, min reviews), "ZİNCİR?" badge, phone-type label; default selection = non-chain HOT/WARM only.
- `/leads`: website-status filter and "Sadece Cep" filter; filter links preserve each other.

**Bugs fixed**: preview dedupe queried a non-existent `businesses.google_place_id` column (now via `business_sources`), fake rating 4.5/12 reviews on manual leads, "Monday" follow-up button always added +2 days, saved discovery audits had hard-coded fields.

## Next session plan
### Step 1 — final check before UI work (review, propose, get approval)
Look for missing UX / lead-finding improvements. Known candidates:
- Google Places caps at 60 results per query → district sweep or sector synonyms to find more leads per search.
- Instagram-only leads: an Instagram DM action/template alongside WhatsApp.
- Saved/reusable WhatsApp message templates (currently only per-message edits).
- `/leads` has no pagination (limit 50).
- Manual lead ingestion (`ingestBusiness`) still uses the old sequential 5-step dedupe; bulk discovery save dedupes only by Place ID + phone.
- Dashboard stats fetch every business row (fine now, won't scale).
- Dead code: `deleteBusinessAction` in `src/app/discover/actions.ts` (unused); `scripts/rescan-leads.ts` is no longer needed (user decided no bulk rescan) — ask before deleting.
- `docs/system-overview-and-architecture.md` (untracked, pre-existing) may be stale.

### Step 2 — UI / UX polish
Not started. User does all visual verification manually.

## Working rules (from user's CLAUDE.md)
Reply in Turkish, code/comments in English. State the plan and wait for approval before every code change. Keep diffs minimal, no new deps without asking, no docs unless asked, no commits unless asked, no browser tests. Build only when the change could break it.
