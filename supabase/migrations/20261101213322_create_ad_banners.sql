/*
# Create ad_banners table for dynamic advertising

1. New Tables
- `ad_banners` stores advertising banners that can be managed dynamically.
  - `id` is the banner UUID.
  - `title` is the headline text shown in the banner.
  - `subtitle` is the secondary text.
  - `image_url` is an optional image URL for the banner visual.
  - `click_url` is the external link opened when the banner is tapped.
  - `placement` indicates where the banner appears ('scanner', 'trades', 'collection', 'all').
  - `is_active` defaults to true; inactive banners are not shown.
  - `created_at` and `updated_at` for auditing.

2. Security
- Row Level Security is enabled.
- All authenticated users can read active banners (SELECT).
- Only service_role can insert/update/delete (for future admin management).
- Anonymous users can also read banners since ads may appear before login.

3. Important Notes
- The app queries active banners filtered by placement and falls back to
  built-in placeholder content when no banners are found.
- This table is a predisposition for future paid banner management.
*/

CREATE TABLE IF NOT EXISTS public.ad_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  click_url text NOT NULL DEFAULT '',
  placement text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ad_banners FROM anon, authenticated;
GRANT SELECT ON public.ad_banners TO anon, authenticated;

DROP POLICY IF EXISTS "read_active_banners" ON public.ad_banners;
CREATE POLICY "read_active_banners" ON public.ad_banners
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS ad_banners_placement_idx
  ON public.ad_banners (placement, is_active);

INSERT INTO public.ad_banners (title, subtitle, image_url, click_url, placement, is_active)
VALUES (
  'Il Covo del Pokémon',
  'Negozio online di carte collezionabili. Clicca per il 10% di sconto!',
  '',
  'https://example.com',
  'all',
  true
)
ON CONFLICT DO NOTHING;
