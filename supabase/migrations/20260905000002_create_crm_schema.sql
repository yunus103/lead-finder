-- Phase 07: CRM Schema Migration
-- Adds contact tracking, follow-ups, and activity logging

-- 1. Extend businesses table with lean CRM operational fields
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS contact_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS exclusion_reason TEXT;

-- 2. Create lead_activities table for chronological history
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('call', 'status_change', 'note', 'follow_up', 'whatsapp')),
    outcome TEXT,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. High-performance indexes for CRM filtering and follow-up queues
CREATE INDEX IF NOT EXISTS idx_businesses_next_follow_up ON public.businesses(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_is_excluded ON public.businesses(is_excluded);
CREATE INDEX IF NOT EXISTS idx_lead_activities_business_id_created ON public.lead_activities(business_id, created_at DESC);