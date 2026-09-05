# Step 07 — CRM

**Phase:** 07 — CRM  
**Status:** COMPLETE

## Objective

Implement a lean, high-velocity CRM and Cold-Calling Cockpit for managing leads, outreach, follow-ups, and sales progress.

## Implementation Details

1. **Schema Migration (`20260905000002_create_crm_schema.sql`)**:
   - Added `contact_attempts`, `last_contacted_at`, `next_follow_up_at`, `notes`, and `exclusion_reason` directly to `businesses`.
   - Created `lead_activities` table with indexes for chronological event tracking (`call`, `status_change`, `note`, `follow_up`, `whatsapp`).
   - Omitted complex relational join tables (`lead_lists` + `lead_list_members`) in favor of direct operational workflow filters.

2. **Cold-Calling Cockpit (`crm-cockpit.tsx`) on `/leads/[id]`**:
   - Prominent phone display with `tel:` dialer trigger and 1-click clipboard copy.
   - 1-click tailored Turkish WhatsApp pitch button with dynamic messaging based on website intelligence findings (no website vs slow website).
   - 1-click call outcome bar (`Cevap Yok`, `Geri Ara`, `İlgilendi`, `Toplantı`, `Red`, `Dışla`).
   - Quick callback presets (`+2 Saat`, `Yarın 10:00`, `Pazartesi 10:00`, `Özel Tarih`).
   - "Sıradakine Geç →" continuous dialer navigation finding the next prioritized lead.
   - Chronological activity timeline and sales notes editor.

3. **Leads Management Table (`/leads`)**:
   - Operational CRM workflow tabs: `📋 Tüm Aktifler`, `📞 Aranacaklar`, `⏰ Geri Aranacaklar`, `🔥 Sıcak Fırsatlar`, `🚫 Dışlananlar`.
   - Follow-up alert badges (`⏰ Takip Vakti!` with pulse animation for due follow-ups).
   - Direct CRM status badges and contact attempt counters.
   - Excluded leads hidden by default from active outreach views.

## Acceptance Criteria

- [x] Leads can move through the defined sales lifecycle.
- [x] Contact attempts and follow-ups are persisted.
- [x] Notes and activity history are available on the lead.
- [x] Lead details can be reviewed from one primary workspace.
- [x] Excluded businesses are kept in the database but excluded from normal workflows.
- [x] CRM data remains connected to the canonical business record.