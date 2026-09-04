-- Phase 03: Discovery Infrastructure Schema
-- Creates searches and search_results tables for search persistence and history

-- 1. Searches Table
CREATE TABLE IF NOT EXISTS public.searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT NOT NULL,
    district TEXT,
    sector TEXT NOT NULL,
    sources TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    raw_count INTEGER DEFAULT 0,
    unique_count INTEGER DEFAULT 0,
    new_count INTEGER DEFAULT 0,
    existing_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- 2. Search Results Table (Tracks each business returned by each search)
CREATE TABLE IF NOT EXISTS public.search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    is_new BOOLEAN NOT NULL DEFAULT FALSE,
    matched_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON public.searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON public.search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_business_id ON public.search_results(business_id);
