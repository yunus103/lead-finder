-- Phase 02: Business Management Schema
-- Creates canonical businesses table and business_sources tracking table

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Canonical Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    address TEXT,
    city TEXT,
    district TEXT,
    
    -- Normalized fields for identity and deduplication
    phone TEXT,
    phone_normalized TEXT,
    website TEXT,
    website_domain TEXT,
    instagram TEXT,
    instagram_normalized TEXT,
    
    -- Performance and rating metrics
    rating NUMERIC(3, 2),
    review_count INTEGER DEFAULT 0,
    
    -- Website status (defaults to UNKNOWN as per SPEC)
    website_status TEXT DEFAULT 'UNKNOWN' CHECK (website_status IN ('UNKNOWN', 'NO_WEBSITE', 'HAS_WEBSITE', 'UNREACHABLE')),
    
    -- Lead status & score placeholders for later phases (keeps schema stable)
    crm_status TEXT DEFAULT 'NEW',
    lead_score INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'LOW',
    is_excluded BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Business Sources Table (Tracks all sources that discovered or enriched a canonical business)
CREATE TABLE IF NOT EXISTS public.business_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google_maps', 'google_search', 'instagram', 'manual')),
    external_id TEXT, -- e.g. Google Place ID
    source_url TEXT,
    raw_data JSONB DEFAULT '{}'::jsonb,
    fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Deduplication and Query Indexes
CREATE INDEX IF NOT EXISTS idx_businesses_phone_normalized ON public.businesses(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_businesses_website_domain ON public.businesses(website_domain);
CREATE INDEX IF NOT EXISTS idx_businesses_instagram_normalized ON public.businesses(instagram_normalized);
CREATE INDEX IF NOT EXISTS idx_businesses_city_district ON public.businesses(city, district);
CREATE INDEX IF NOT EXISTS idx_businesses_crm_status ON public.businesses(crm_status);
CREATE INDEX IF NOT EXISTS idx_businesses_lead_score ON public.businesses(lead_score DESC);

CREATE INDEX IF NOT EXISTS idx_sources_business_id ON public.business_sources(business_id);
CREATE INDEX IF NOT EXISTS idx_sources_provider_external_id ON public.business_sources(provider, external_id);

-- 4. Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_businesses_updated_at ON public.businesses;
CREATE TRIGGER set_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
