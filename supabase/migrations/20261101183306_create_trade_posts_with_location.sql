/*
# Create trade posts with privacy-aware location

1. New Table
- `trade_posts` stores public trade announcements for signed-in CardDex users.
- `id` is the announcement UUID.
- `user_id` identifies the owner and defaults to the authenticated session user.
- `card_name` and `card_image_url` describe the card being offered.
- `wanted_card_name` describes the card the owner would like in exchange.
- `note` stores optional public context for the exchange.
- `latitude` and `longitude` store rounded coordinates used only for approximate distance sorting.
- `created_at` records when the announcement was created.

2. Security
- Row Level Security is enabled.
- Authenticated users can read the shared feed.
- Only the owner can create, edit, or delete their own announcement.
- Anonymous users have no Data API access.
- The owner column is database-controlled through `auth.uid()` and is excluded from client insert privileges.

3. Privacy Notes
- The app rounds GPS coordinates before saving them, so the database does not retain the device's full precision.
- The UI never renders latitude, longitude, a map pin, or an exact address; it shows only an approximate distance in kilometers.
*/

CREATE TABLE IF NOT EXISTS public.trade_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name text NOT NULL,
  card_image_url text NOT NULL,
  wanted_card_name text NOT NULL,
  note text NOT NULL DEFAULT '',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_posts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.trade_posts FROM anon, authenticated;
GRANT SELECT, DELETE ON public.trade_posts TO authenticated;
GRANT INSERT (card_name, card_image_url, wanted_card_name, note, latitude, longitude) ON public.trade_posts TO authenticated;
GRANT UPDATE (card_name, card_image_url, wanted_card_name, note, latitude, longitude) ON public.trade_posts TO authenticated;

DROP POLICY IF EXISTS "authenticated_read_trade_posts" ON public.trade_posts;
CREATE POLICY "authenticated_read_trade_posts" ON public.trade_posts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_own_trade_posts" ON public.trade_posts;
CREATE POLICY "insert_own_trade_posts" ON public.trade_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_trade_posts" ON public.trade_posts;
CREATE POLICY "update_own_trade_posts" ON public.trade_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_trade_posts" ON public.trade_posts;
CREATE POLICY "delete_own_trade_posts" ON public.trade_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS trade_posts_created_at_idx
  ON public.trade_posts (created_at DESC);
