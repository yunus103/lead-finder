-- Phase 06: Lead Scoring Schema
-- Adds score_reasons JSONB column to businesses for score explainability

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS score_reasons JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_businesses_priority ON public.businesses(priority);
