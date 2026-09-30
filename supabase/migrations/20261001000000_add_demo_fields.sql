-- Demo integration: one active demo site per lead (served at https://<slug>.yaytechstudio.com)

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS demo_template TEXT,
ADD COLUMN IF NOT EXISTS demo_slug TEXT,
ADD COLUMN IF NOT EXISTS demo_url TEXT,
ADD COLUMN IF NOT EXISTS demo_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS demo_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS demo_view_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS demo_last_viewed_at TIMESTAMPTZ;
