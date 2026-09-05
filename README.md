# Yaytech Lead Finder

An internal cold-calling, lead generation, and outbound sales acceleration platform built for **Yaytech Studio**.

## Purpose

Lead Finder helps Yaytech Studio systematically discover local Turkish businesses that either lack a website or maintain an outdated, non-responsive web presence. It scores each candidate, extracts actionable sales openings (e.g. missing mobile viewport, lack of WhatsApp button, poor load speed), and provides a high-efficiency dialer cockpit to run and track daily cold-call outreach.

---

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, React Server Components & Server Actions)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with Yaytech Studio Design Language (Geist typography, high-contrast dark dialer terminal)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL with UUID v4, full schema migrations, and indexing)
- **Data Providers:** Google Places API (New Text Search) with pagination (20 / 40 / 60 leads)
- **Intelligence Engine:** Cheerio-based in-memory DOM parser for responsive viewport, WhatsApp CTA, SSL, and technology stack audits

---

## Core Workflow

```text
Discovery Engine (/discover)
  └─► Query city, district & sector via Google Maps Places API
  └─► Live in-memory sandbox scoring & duplicate detection
        └─► One-Click Batch Import to CRM (~1s)

CRM Pipeline & Directory (/leads)
  └─► Filter by Priority (HOT / WARM / COLD) and Call Status
  └─► Instant score recalculation & manual lead dialog

Lead Intelligence Cockpit (/leads/[id])
  └─► Real-time lightweight scan & comprehensive sales pitch generator
  └─► Automated opening hook generation (pitch angles based on detected flaws)

Calling Cockpit (/queue)
  └─► Obsidian mono terminal with one-click dialer & WhatsApp integration
  └─► Tactile outcome buttons (Won, Follow-up, Meeting, Not Interested, Invalid)
  └─► Automatic contact attempt counters and follow-up date scheduling

Dashboard Command Center (/)
  └─► Live metric counters, pipeline conversion rates, and queue shortcut
```

---

## Getting Started

### 1. Prerequisites

- Node.js 18+ or 20+
- A Supabase project with database migrations applied (`supabase/migrations/`)
- A Google Cloud API Key with **Places API (New)** enabled

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GOOGLE_PLACES_API_KEY=your-google-places-api-key
```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run production build check
npm run build
```

The application will be available at `http://localhost:3000`.
