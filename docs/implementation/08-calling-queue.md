# Step 08 — Calling Queue

**Phase:** 08 — Calling Queue  
**Status:** COMPLETE

## Objective

Create a focused, zero-scroll calling queue for dialing high-priority leads with 1-click outcome auto-advance and niche batching.

## Implementation Details

1. **Queue Service Extensions (`crm-service.ts`)**:
   - `getNextLeadId`: Prioritizes due follow-ups (`next_follow_up_at <= NOW()`), high-scoring actionable prospects (`lead_score DESC` in `NEW`, `TO_CALL`, `QUALIFIED`), and untouched leads (`contact_attempts = 0`). Excludes closed (`WON`, `LOST`) and suppressed (`is_excluded = true`) leads.
   - `getQueueLead`: Fetches the active top candidate or specific lead by ID with category and district filtering.
   - `getQueueMeta`: Computes remaining actionable lead counts and dynamically extracts active categories and districts for dropdown segmentation.

2. **Zero-Scroll Focused Calling Cockpit (`queue-dialer.tsx` & `/queue`)**:
   - Layout engineered to fit entirely in a single screen (100vh) with zero mouse scrolling required.
   - **Context & Pitch View**:
     - Business name, category, district, Google rating (★ 4.9 / 180 yorum), and score reasons.
     - Prominent Cold-Call Pitch Script ("Aramada Kullanılacak Satış Açılışı") card with 1-click copy.
   - **Dialer & 1-Click Action Bar**:
     - Phone display with `tel:` link, 1-click copy, and 1-click tailored Turkish WhatsApp pitch button.
     - 1-Click Outcome Bar: `[ 📵 Cevap Yok ]`, `[ ⏰ Geri Ara ]` (presets: `+2 Saat`, `Yarın 10:00`, `Pazartesi 10:00`), `[ 🔥 İlgilendi ]`, `[ ❌ Red ]`, `[ ⏭️ Atla ]`, `[ 🚫 Dışla ]`.
     - Automatically logs the interaction and immediately advances to the next prioritized lead in the queue without full page reload.
   - **Queue Completion State**:
     - When all leads in the chosen segment or database are completed, shows a celebratory empty state with quick links to clear filters or discover new businesses.

3. **Global Navigation**:
   - Added **Arama Sırası** (`/queue`) to `navbar.tsx`.

## Acceptance Criteria

- [x] The queue contains actionable leads ordered by due follow-ups and lead score.
- [x] Key lead information, pitch script, and dialer are visible in a single screen without scrolling.
- [x] Outreach actions correctly update CRM data and activity records.
- [x] Follow-ups appear when due.
- [x] The user can efficiently work through the queue with 1-click auto-advance.
- [x] Excluded and closed leads are filtered out of the queue.