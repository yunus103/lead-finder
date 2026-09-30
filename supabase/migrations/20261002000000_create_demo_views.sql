-- Demo view tracking: one row per page open, sent by yaytech-demos/_shared/preview.js

CREATE TABLE IF NOT EXISTS public.demo_views (
    id UUID PRIMARY KEY, -- generated in the browser so later beacons (end, action) can find the row
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    visitor_id TEXT,
    city TEXT,
    region TEXT,
    country TEXT,
    device TEXT,
    os TEXT,
    browser TEXT,
    referrer TEXT,
    duration_seconds INTEGER,
    max_scroll INTEGER,
    actions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_views_business_created ON public.demo_views(business_id, created_at DESC);

-- Keeps the denormalized counters on businesses in sync, atomically.
CREATE OR REPLACE FUNCTION bump_demo_view_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.businesses
    SET demo_view_count = demo_view_count + 1,
        demo_last_viewed_at = NEW.created_at
    WHERE id = NEW.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS demo_views_bump_stats ON public.demo_views;
CREATE TRIGGER demo_views_bump_stats
    AFTER INSERT ON public.demo_views
    FOR EACH ROW
    EXECUTE FUNCTION bump_demo_view_stats();

-- Set when yaytech-demos deletes the site (cleanup or manual removal).
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS demo_deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_businesses_demo_last_viewed ON public.businesses(demo_last_viewed_at DESC NULLS LAST);
