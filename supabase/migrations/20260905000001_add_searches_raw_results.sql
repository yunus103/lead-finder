-- Phase 07: Search Results Persistence Schema
-- Adds raw_results JSONB column to searches to allow full replay of past candidate discoveries

ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS raw_results JSONB DEFAULT '[]'::jsonb;
