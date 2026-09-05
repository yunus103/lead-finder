-- Phase 05: Website Intelligence Schema
-- Creates website_audits table and adds last_scanned_at to businesses

-- 1. Add last_scanned_at column to businesses
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;

-- 2. Create website_audits table
CREATE TABLE IF NOT EXISTS public.website_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    audit_type TEXT NOT NULL CHECK (audit_type IN ('lightweight', 'deep')),
    url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'timeout', 'ssl_error', 'unreachable')),
    http_status INTEGER,
    response_time_ms INTEGER,
    is_https BOOLEAN DEFAULT FALSE,
    title TEXT,
    meta_description TEXT,
    h1 TEXT,
    has_viewport BOOLEAN DEFAULT FALSE,
    technologies TEXT[] DEFAULT '{}'::text[],
    social_links JSONB DEFAULT '{}'::jsonb,
    contact_emails TEXT[] DEFAULT '{}'::text[],
    contact_phones TEXT[] DEFAULT '{}'::text[],
    deep_audit_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_website_audits_business_id ON public.website_audits(business_id);
CREATE INDEX IF NOT EXISTS idx_website_audits_created_at ON public.website_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_last_scanned_at ON public.businesses(last_scanned_at);
