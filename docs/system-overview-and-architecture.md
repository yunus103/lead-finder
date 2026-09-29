# Yaytech Lead Intelligence — System Overview & Architecture Specification

**Product:** Yaytech Lead Intelligence  
**Version:** V1.0 Production  
**Target Organization:** Yaytech Studio  
**Classification:** Internal Sales Management & Lead Discovery System  

---

## 1. Executive Summary & Purpose

### 1.1 Product Purpose
**Yaytech Lead Intelligence** is an internal, single-operator lead discovery, web intelligence, and high-velocity cold-calling system built specifically for **Yaytech Studio** (a web design and software engineering agency).

The fundamental mission of the platform is:
> **Identify local businesses that have high commercial potential but either lack a web presence or operate an outdated, broken, or low-converting website, and enable a solo operator to qualify, pitch, and follow up with them at maximum speed.**

### 1.2 The Problem It Solves
Traditional B2B agency client acquisition involves high operational friction:
* Manually searching Google Maps and directory sites.
* Opening multiple tabs to inspect business websites and verify responsiveness.
* Manually checking whether phone numbers are mobile lines or switchboards.
* Manually maintaining fragmented spreadsheets or complicated CRM pipelines.
* Forgetting scheduled follow-ups and losing touch with interested prospects.

Yaytech Lead Intelligence integrates discovery, automated technical analysis, deterministic lead scoring, and an interactive cold-calling dialer into an end-to-end continuous pipeline.

### 1.3 Target Throughput & Scope Constraints
* **Throughput:** Designed to discover, filter, and qualify **50–100 new businesses per day** with zero database clutter or unnecessary network latency.
* **Non-Goals (Out of Scope for V1):**
  * Multi-tenant SaaS architecture, billing, and role permissions.
  * Automated email/SMS/Instagram spam sequences (all outreach is initiated by a human operator).
  * Opaque or probabilistic AI/LLM lead scoring (all scoring is 100% deterministic and rule-based).

---

## 2. Technology Stack & Architectural Decisions

### 2.1 Core Stack
* **Web Framework:** Next.js 15 (App Router with React Server Components and Server Actions).
* **UI & Rendering:** React 19, Tailwind CSS 3.4, PostCSS, Lucide/Heroicon inline SVGs.
* **Language:** TypeScript 5 (strict typing across all schemas, domain models, and API boundaries).
* **Database & Persistence:** Supabase (Managed PostgreSQL) utilizing `@supabase/supabase-js`.
  * Client layer: Public anonymous client (`supabase`).
  * Backend Service layer: Privileged administrative client (`supabaseAdmin`) using the Supabase Service Role Key for server actions.
* **Website Intelligence Engine:** Node native `fetch` combined with `cheerio` (Fast DOM parsing).
* **Discovery Integration:** Modern Google Places API (New) — `places:searchText`.

### 2.2 Key Architectural Decisions
| Architectural Decision | Choice | Rationale |
|---|---|---|
| **Website Scanning** | Native `fetch` + `cheerio` | Headless browsers (Puppeteer/Playwright) introduce 5–15s latency per page, heavy RAM footprints, and fragile binary dependencies. `cheerio` executes in 150–400ms with a strict 5000ms timeout and 500 KB response ceiling. |
| **Google Places API (New)** | Minimal `X-Goog-FieldMask` | By explicitly requesting only essential fields (`places.id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,googleMapsUri`), API costs remain in Google's lowest pricing tier, fitting within the monthly $200 recurring credit. |
| **Discovery Sandbox** | Ephemeral In-Memory Sandbox | Discovered places are parsed, pre-scored, and verified in memory before saving. Users selectively commit approved prospects to the database, preventing CRM pollution from franchise chains or government offices. |
| **Lead Scoring** | Pure Deterministic Function | Rule-based scoring (`calculateLeadScore`) guarantees 0 API cost, sub-millisecond execution, zero LLM hallucinations, and explainable score factors. |
| **CRM Architecture** | High-Velocity Cold-Calling Cockpit | Replaces multi-table list structures with 1-click outcome triggers (`no_answer`, `callback`, `interested`, `meeting`, `rejected`, `excluded`), auto-advancing to the next best prospect without manual navigation. |

---

## 3. Database Schema & Data Models

The system is backed by PostgreSQL on Supabase, structured around five core tables:

```
┌─────────────────────────────────────────────────────────────┐
│                          businesses                         │
│  (Canonical Business Entity & Core CRM Sales Records)       │
└────────────────┬───────────────────────────┬────────────────┘
                 │ 1                         │ 1
                 │                           │
                 │ *                         │ *
┌────────────────▼─────────────┐   ┌─────────▼───────────────┐
│       business_sources       │   │     website_audits      │
│  (Multi-provider discovery   │   │  (Lightweight & Deep    │
│   and enrichment lineage)    │   │   technical scans)      │
└──────────────────────────────┘   └─────────────────────────┘
                 │ 1                         │ 1
                 │                           │
                 │ *                         │ *
┌────────────────▼─────────────┐   ┌─────────▼───────────────┐
│           searches           │   │     lead_activities     │
│  (Query audit logs & raw     │   │  (Chronological call &  │
│   candidate cache)           │   │   CRM interaction log)  │
└──────────────────────────────┘   └─────────────────────────┘
```

### 3.1 `businesses` (Canonical Entity)
Represents the single source of truth for a prospect.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique identifier (generated via `gen_random_uuid()`). |
| `name` | `TEXT` | Canonical business name. |
| `category` | `TEXT` | Primary trade or industry (e.g., "Diş Kliniği"). |
| `address` | `TEXT` | Formatted street address. |
| `city` | `TEXT` | Turkish province (e.g., "İstanbul"). |
| `district` | `TEXT` | District / municipality (e.g., "Kadıköy"). |
| `phone` | `TEXT` | Raw formatted phone number. |
| `phone_normalized` | `TEXT` | Normalized numeric phone (indexed for deduplication). |
| `website` | `TEXT` | Full website URL. |
| `website_domain` | `TEXT` | Clean root domain (e.g., "ornekdis.com", indexed). |
| `instagram` | `TEXT` | Instagram profile URL or handle. |
| `instagram_normalized`| `TEXT` | Normalized handle (lowercase, stripped of `@`). |
| `rating` | `NUMERIC(2,1)` | Google Maps star rating (1.0 – 5.0). |
| `review_count` | `INTEGER` | Total number of Google customer reviews. |
| `website_status` | `TEXT` | `UNKNOWN`, `NO_WEBSITE`, `HAS_WEBSITE`, `UNREACHABLE`. |
| `crm_status` | `TEXT` | `NEW`, `QUALIFIED`, `TO_CALL`, `CONTACTED`, `FOLLOW_UP`, `INTERESTED`, `MEETING`, `PROPOSAL`, `WON`, `LOST`. |
| `lead_score` | `INTEGER` | Deterministic score (0–100). |
| `priority` | `TEXT` | `HOT` (80–100), `WARM` (60–79), `COLD` (40–59), `LOW` (0–39). |
| `score_reasons` | `JSONB` | Array of contributing score reasons (`label`, `points`, `type`). |
| `is_excluded` | `BOOLEAN` | Suppression flag (excludes business from active calling). |
| `exclusion_reason` | `TEXT` | `chain`, `invalid_number`, `existing_client`, `irrelevant_sector`, `other`. |
| `contact_attempts` | `INTEGER` | Number of times outreach was initiated. |
| `last_contacted_at` | `TIMESTAMPTZ` | Timestamp of the most recent call attempt. |
| `next_follow_up_at` | `TIMESTAMPTZ` | Scheduled reminder timestamp for callbacks. |
| `notes` | `TEXT` | Freeform operator notes. |
| `last_scanned_at` | `TIMESTAMPTZ` | Last website audit timestamp. |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | System audit timestamps. |

### 3.2 `business_sources` (Lineage & Enrichment Tracking)
Links each discovery event to the canonical business record.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique record ID. |
| `business_id` | `UUID` (FK) | References `businesses.id` (CASCADE on delete). |
| `provider` | `TEXT` | Source provider: `google_maps`, `google_search`, `instagram`, `manual`. |
| `external_id` | `TEXT` | Provider identifier (e.g. Google Place ID). |
| `source_url` | `TEXT` | Direct link to original profile or Google Maps location. |
| `raw_data` | `JSONB` | Unmodified payload returned by the provider. |
| `fetched_at` | `TIMESTAMPTZ` | Timestamp when data was retrieved. |

### 3.3 `searches` (Audit & Replay Cache)
Records search criteria and caches candidate results for zero-cost replay.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique search ID. |
| `location` | `TEXT` | Searched city/province. |
| `district` | `TEXT` | Searched district. |
| `sector` | `TEXT` | Target business sector / keyword. |
| `sources` | `TEXT[]` | Providers queried (e.g., `["google_maps"]`). |
| `status` | `TEXT` | `processing`, `completed`, `failed`. |
| `raw_count` | `INTEGER` | Total raw places returned by provider. |
| `unique_count` | `INTEGER` | Valid candidate places after negative keyword filtering. |
| `new_count` | `INTEGER` | Candidates not yet in the database. |
| `existing_count` | `INTEGER` | Candidates already registered in `businesses`. |
| `raw_results` | `JSONB` | Cached array of candidate leads with in-memory scores. |
| `error_message` | `TEXT` | Error description if status is `failed`. |
| `completed_at` | `TIMESTAMPTZ` | Completion timestamp. |

### 3.4 `website_audits` (Technical Analysis Reports)
Stores detailed lightweight and deep technical analysis of prospect websites.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique audit ID. |
| `business_id` | `UUID` (FK) | References `businesses.id`. |
| `audit_type` | `TEXT` | `lightweight` or `deep`. |
| `url` | `TEXT` | Audited web URL. |
| `status` | `TEXT` | `success`, `failed`, `timeout`, `ssl_error`, `unreachable`. |
| `http_status` | `INTEGER` | HTTP response code (200, 301, 404, 500, etc.). |
| `response_time_ms` | `INTEGER` | Time-to-first-byte / complete page download time. |
| `is_https` | `BOOLEAN` | Indicates valid SSL encryption. |
| `has_viewport` | `BOOLEAN` | Indicates presence of `<meta name="viewport">` (mobile friendliness). |
| `technologies` | `TEXT[]` | Detected CMS/frameworks (WordPress, Elementor, Wix, Shopify, etc.). |
| `social_links` | `JSONB` | Extracted social URLs (Instagram, Facebook, LinkedIn). |
| `contact_emails` | `TEXT[]` | Extracted email addresses. |
| `contact_phones` | `TEXT[]` | Extracted telephone numbers. |
| `deep_audit_data` | `JSONB` | Structured deep analysis (`hasWhatsApp`, `hasCallButton`, `speedLabel`, `salesPitch`, `problems`). |

### 3.5 `lead_activities` (CRM Event Stream)
Stores immutable chronological actions and call outcomes.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique activity ID. |
| `business_id` | `UUID` (FK) | References `businesses.id`. |
| `type` | `TEXT` | `call`, `status_change`, `note`, `follow_up`, `whatsapp`. |
| `outcome` | `TEXT` | `no_answer`, `callback`, `interested`, `meeting`, `proposal`, `rejected`, `excluded`. |
| `content` | `TEXT` | Narrative description or call note. |
| `metadata` | `JSONB` | State snapshot (`previous_status`, `new_status`, `contact_attempt`, `follow_up_at`). |
| `created_at` | `TIMESTAMPTZ` | Event timestamp. |

---

## 4. Progressive Deduplication & Enrichment Engine

To prevent duplicate outreach and guarantee clean data across discovery cycles, `services/business-service.ts` implements a 5-tier progressive matching cascade:

```text
Incoming Lead from Discovery Provider
                 │
  [Tier 1] Match by Google Place ID in `business_sources`?
      ├── YES ──> Existing Business Found
      └── NO
  [Tier 2] Match by Normalized Phone Number?
      ├── YES ──> Existing Business Found
      └── NO
  [Tier 3] Match by Clean Website Domain?
      ├── YES ──> Existing Business Found
      └── NO
  [Tier 4] Match by Normalized Instagram Handle?
      ├── YES ──> Existing Business Found
      └── NO
  [Tier 5] Match by Normalized Business Name + City?
      ├── YES ──> Existing Business Found
      └── NO  ──> Brand New Unique Business Record
```

### 4.1 Non-Destructive Canonical Enrichment
When an incoming lead matches an existing record:
1. **Never Overwrites User Data:** CRM status (`crm_status`), salesperson notes (`notes`), contact attempts, and follow-up schedules are completely preserved.
2. **Backfills Missing Attributes:** If the existing record lacks a phone number, website, category, or Instagram link, incoming verified data fills the gap.
3. **Metric Upgrades:** If the incoming Google Maps record has a higher review count or updated rating, metrics are updated.
4. **Automated Rescoring:** The lead score is recalculated against the enriched composite state.
5. **Lineage Attachment:** A new record is inserted into `business_sources`, logging the discovery provider and timestamp.

---

## 5. Deterministic Explainable Lead Scoring Engine

The scoring engine (`services/scoring/lead-scorer.ts`) evaluates three core pillars:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   DETERMINISTIC LEAD SCORE (0–100)                     │
├──────────────────────┬──────────────────────────┬──────────────────────┤
│ Website Opportunity  │  Commercial Reputation   │     Reachability     │
│     (Max ~40 pts)    │      (Max ~35 pts)       │     (Max ~25 pts)    │
└──────────────────────┴──────────────────────────┴──────────────────────┘
```

### 5.1 Scoring Rulebook & Weights

#### Pillar 1: Website Opportunity (The Agency Selling Trigger)
* **No Website:** `+35 points` — Absolute prime target. High local activity without an online presence.
* **Unreachable / Broken Website:** `+30 points` — Broken link, HTTP 5xx, or DNS failure losing real customers.
* **Missing Viewport Tag:** `+10 points` — Website breaks on mobile devices.
* **Slow Response Time (> 1500 ms):** `+8 points` — Severe loading delay causing customer bounce.
* **Missing SSL Certificate (HTTP only):** `+8 points` — Chrome/Safari displays "Not Secure" warning.
* **Missing WhatsApp Conversion Button:** `+5 points` — High visitor bounce, friction in booking appointments.
* **Heavy / Outdated WordPress:** `+5 points` — Bloated themes or outdated plugins.
* **Modern / Fast Site Penalty:** `-20 points` — Fast, responsive, modern stack (e.g. Next.js, React <600ms).

#### Pillar 2: Commercial Viability & Reputation (Ability to Pay)
* **Reviews ≥ 100:** `+20 points` — High customer transaction volume and established revenue.
* **Reviews 30 – 99:** `+15 points` — Steady commercial demand.
* **Reviews 10 – 29:** `+8 points` — Moderate local presence.
* **Reviews 1 – 9:** `+3 points` — Early traction.
* **Rating ≥ 4.5 Stars:** `+15 points` — High client satisfaction and pride in business reputation.
* **Rating 4.0 – 4.4 Stars:** `+10 points` — Good reputation.
* **Rating 3.5 – 3.9 Stars:** `+5 points` — Average rating.

#### Pillar 3: Outreach Reachability
* **Direct Phone Number Available:** `+15 points` — High-velocity dialing possible.
* **Instagram Profile Present:** `+5 points` — Alternative outreach and social verification.
* **Scraped Email Address Found:** `+5 points` — Additional corporate contact channel.

#### Penalties
* **Excluded / Suppressed Business:** `-50 points` — Penalizes disqualified leads.

### 5.2 Priority Tiers
* **HOT (80 – 100):** Prime candidates. Strong commercial reputation + no website or broken site + direct phone.
* **WARM (60 – 79):** Viable opportunities. Outdated or slow websites with good Google ratings.
* **COLD (40 – 59):** Marginal opportunities. Lower review counts or existing acceptable websites.
* **LOW (0 – 39):** Poor opportunities, excluded businesses, or modern high-performance existing websites.

---

## 6. Website Intelligence & Sales Pitch Pipeline

The technical audit engine translates raw HTML tags and network timings into persuasive sales talking points.

### 6.1 Lightweight Scanner (`services/website/scanner.ts`)
Executes during in-memory discovery in bounded batches of 5 parallel requests:
* Protocol fallback: Attempts HTTPS first; if SSL handshake fails, immediately tests HTTP fallback.
* Headless mitigation: Standard desktop Chrome User-Agent header.
* Cheerio parsing:
  * Detects `<meta name="viewport">`.
  * Detects meta title, meta description, and first `<h1>`.
  * Scrapes `mailto:` and `tel:` anchor attributes.
  * Regex search for WhatsApp widgets (`wa.me`, `api.whatsapp.com`).
  * Fingerprints CMS: WordPress, Elementor, WooCommerce, Shopify, Wix, Squarespace, Webflow, Next.js.

### 6.2 Deep Audit & Teleprompter Sales Pitch Generator (`services/website/deep-audit.ts`)
Executed on-demand when opening a lead detail page. Automatically creates tailored Turkish sales pitches based on exact defects:

| Detected Defect | Generated Cold Call Sales Pitch |
|---|---|
| **No Website** | *"Merhabalar, Google Haritalar'daki yüksek puanlı profilinizi ve müşteri yorumlarınızı inceledim; bölgenizde oldukça iyi bir bilinirliğiniz var ancak aktif bir web siteniz bulunmuyor. Google'da sizi arayan potansiyel müşterilerin doğrudan randevu alabileceği modern bir altyapı hazırlayabiliriz."* |
| **Unreachable Site** | *"Hocam merhaba, Google Haritalar profilinizdeki web sitesi bağlantınız şu an açılmıyor, sayfa hata veriyor. Sizi arayan müşteriler doğrudan boş sayfayla karşılaşıyor. Bu kaybı durdurmak için sitenizi hemen ayağa kaldıralım."* |
| **Missing Mobile Viewport** | *"Hocam merhaba, web sitenizi cep telefonundan inceledim; sayfa mobilde kayma yapıyor ve yazılar küçücük kalıyor. Google'dan gelen müşterilerin %80'i mobilde. Sitenizi telefonlara tam oturan, modern bir yapıya kavuşturalım."* |
| **Missing WhatsApp Button** | *"Hocam merhaba, web siteniz aktif ancak ziyaretçiyi anında sıcak kontağa çevirecek bir WhatsApp veya hızlı teklif butonu yok. Müşteriler girip bakıp çıkıyor. Sayfanıza anında dönüşüm getirecek modern bir düzenleme yapalım."* |
| **Slow (> 1500 ms)** | *"Hocam merhaba, web siteniz şu an ortalama {time} ms sürede açılıyor. Cep telefonundan giren kullanıcılar beklemeyip geri tuşuna basıyor. Sayfanızı saniyenin altında açılan ışık hızında bir siteye dönüştürelim."* |

---

## 7. High-Velocity Cold-Calling Queue & Dialer Mechanics

The `/queue` interface is designed for high-throughput telephone outreach:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [ Arama Sırası ]  [ Tüm Sektörler ▼ ]  [ Tüm İlçeler ▼ ]    (42 Aday Kaldı) │
├───────────────────────────────────────────────────────────────────────────┤
│  LEFT COLUMN: Business Intelligence    │  RIGHT COLUMN: Action Terminal   │
│  ──────────────────────────────────    │  ─────────────────────────────── │
│  🔥 SKOR 95 • HOT   [ SİTE YOK ]       │  🎙️ Satış Açılış Metni (Teleprompter)│
│  Özel Dent Kadıköy Diş Kliniği         │  "Merhabalar, haritalardaki..."   │
│  Kadıköy, İstanbul                     │  [ 📋 Metni Kopyala ]             │
│  ★ 4.9 (142 Yorum)                     ├───────────────────────────────────┤
│                                        │  DOĞRUDAN İLETİŞİM HATTI          │
│  Tespit Edilen Fırsatlar:              │  0216 345 67 89                   │
│  +35 Web sitesi bulunmuyor             │  [ 📞 Ara ] [ 📋 ] [ 💬 WhatsApp ]│
│  +20 100'den fazla Google yorumu       ├───────────────────────────────────┤
│  +15 Yüksek müşteri memnuniyeti (4.9)  │  SONUCU KAYDET & SIRADAKİNE GEÇ   │
│  +15 Doğrudan telefon numarası         │  [ 📵 Cevap Yok ] [ ⏰ Geri Ara ]  │
│                                        │  [ 🔥 İlgilendi ] [ ❌ Red ]       │
│  [ 📍 Google Haritalar'da Gör ↗ ]      │  [ ⏭️ Atla ]     [ 🚫 Dışla ]     │
└────────────────────────────────────────┴───────────────────────────────────┘
```

### 7.1 Queue Navigation & Auto-Advancing
1. **Lead Selection Hierarchy (`getNextLeadId`):**
   * Priority 1: Scheduled follow-ups that are due (`next_follow_up_at <= NOW()`).
   * Priority 2: Highest-scoring actionable leads (`crm_status` IN `NEW`, `TO_CALL`, `QUALIFIED`).
   * Priority 3: Any remaining non-excluded lead not in `WON` or `LOST`.
2. **Instant Outcome Actions:**
   * **Cevap Yok (`no_answer`):** Increments contact attempts, advances status to `CONTACTED`, logs timestamped activity, and automatically transitions to the next lead.
   * **Geri Ara (`callback`):** Expands one-click follow-up presets (`+2h`, `Yarın Sabah 10:00`, `Pazartesi 10:00`), writes `next_follow_up_at`, sets status to `FOLLOW_UP`, and auto-advances.
   * **İlgilendi (`interested`):** Flags lead as `INTERESTED`, records hot lead activity, and auto-advances.
   * **Red (`rejected`):** Moves lead to `LOST`, preventing repeated calls.
   * **Atla (`skip`):** Leaves lead state unchanged and displays next candidate.
   * **Dışla (`exclude`):** Suppresses lead with a selected reason (`Zincir/Şube`, `Geçersiz Numara`, `Mevcut Müşteri`, `Alakasız Sektör`), applying a -50 point score penalty.

### 7.2 WhatsApp Direct Opener
Clicking the `💬 WhatsApp` button automatically normalizes the phone number with Turkey's country code (`+90`) and launches `https://wa.me/905XXXXXXXXX?text=...` with a pre-filled, personalized Turkish message containing the business name and Yaytech Studio proposal link.

---

## 8. CRM Lifecycle & Status Machine

The platform implements a focused 10-stage sales progression model:

```text
       [ NEW ] ──────────> [ QUALIFIED ]
          │                      │
          ├──────────────────────┼──────────────────────> [ TO_CALL ]
          │                      │                            │
          ▼                      ▼                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                       [ CONTACTED ]                         │
   └──────────────┬───────────────────────────────┬──────────────┘
                  │                               │
                  ▼                               ▼
          [ FOLLOW_UP ]                    [ INTERESTED ]
                  │                               │
                  │                               ▼
                  │                        [ MEETING ]
                  │                               │
                  │                               ▼
                  │                        [ PROPOSAL ]
                  │                               │
                  ├───────────────────────────────┴──────────────┐
                  │                                              │
                  ▼                                              ▼
              [ LOST ]                                        [ WON ]
```

| CRM Status | Turkish Label | Operational Meaning |
|---|---|---|
| `NEW` | Yeni Aday | Ingested candidate, unreviewed. |
| `QUALIFIED` | Nitelikli | High lead score or verified sales potential. |
| `TO_CALL` | Aranacak | Enqueued for immediate cold calling. |
| `CONTACTED` | Ulaşıldı | Attempted call made (e.g. no answer / gatekeeper). |
| `FOLLOW_UP` | Geri Aranacak | Scheduled for callback at a specific future time. |
| `INTERESTED` | İlgileniyor | Decision maker expressed interest in web development. |
| `MEETING` | Toplantı Ayarlandı | Presentation or discovery call scheduled. |
| `PROPOSAL` | Teklif İletildi | Formal proposal / pricing quote submitted. |
| `WON` | Kazanıldı | Deal closed; client contract signed. |
| `LOST` | Olumsuz / Red | Not interested, closed lost, or rejected. |

---

## 9. Operational Daily Playbook (Solo Sales Workflow)

To maximize deal acquisition velocity, the operator should follow this daily routine:

### Step 1: Morning Briefing on Dashboard (`/`)
1. Open the application dashboard.
2. Check the **Urgent Due Follow-Ups (Acil Takip Bekleyenler)** alert bar. Call any overdue callbacks immediately.
3. Review pipeline metrics: check how many candidates remain in `Aranacaklar`.

### Step 2: Discovery & Pool Replenishment (`/discover`)
1. If remaining actionable leads fall below 30, open `/discover`.
2. Select target city (e.g., *İstanbul* or *Bursa*), select a district, and pick a high-value sector preset (e.g., *Diş Kliniği*, *Güzellik Merkezi*, *Estetik Cerrah*, *Hukuk Bürosu*).
3. Set discovery limit to **40 or 60**.
4. Click **Adayları Keşfet**. Wait ~4–8 seconds while in-memory scans, institution filtering, and lead scoring run.
5. Review results in the preview table. Uncheck any known irrelevant companies.
6. Click **Seçilenleri CRM'e Kaydet**. Selected leads are ingested into `businesses` in <100ms.

### Step 3: High-Velocity Cold Calling Session (`/queue`)
1. Click **📞 Güne Başla / Arama Sırası** from the dashboard or navigate to `/queue`.
2. Filter by sector or district if focusing on a specific vertical.
3. Review the left column: Business name, review count, rating, and identified technical flaws.
4. Read the **Satış Açılış Metni** (customized teleprompter pitch).
5. Click **📞 Ara** to dial from smartphone/desktop dialer, or **💬 WhatsApp** to initiate text outreach.
6. As soon as the call ends, click the corresponding outcome button (`📵 Cevap Yok`, `⏰ Geri Ara`, `🔥 İlgilendi`, or `❌ Red`).
7. The system instantly logs the activity, updates the database, and renders the next prospect.

### Step 4: Deal Pipeline Management (`/leads`)
1. Review the **Sıcak Fırsatlar** tab to follow up on leads in `INTERESTED` or `MEETING` status.
2. For scheduled presentations, open the lead cockpit (`/leads/[id]`) to review the complete technical audit, technological stack, and historical call notes.
3. Update status to `PROPOSAL` when sending the quotation, and finally mark as `WON` upon agreement.

---

## 10. Summary & System Health

* **Build & Type Safety:** Fully verified Next.js 15 production build with zero TypeScript or linting errors.
* **API Quota Protection:** Bounded field masks and search result caching eliminate redundant Google API expenditures.
* **Data Integrity:** Strict progressive deduplication prevents duplicate outreach while preserving historical notes and customer context.
