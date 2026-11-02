/*
# Create user wishlist table

1. New Table
- `user_wishlist` stores cards a signed-in CardDex user is searching for.
- `id` is the wishlist entry UUID.
- `user_id` identifies the owner and defaults to the authenticated session user.
- `card_id_api` stores the Pokémon TCG API card identifier used for matchmaking.
- `name`, `image_url`, and `set_name` describe the wished card for display.
- `created_at` records when the entry was added.

2. Security
- Row Level Security is enabled.
- Only the owner can read, create, or delete their own wishlist entries.
- Anonymous users have no Data API access.
- The owner column is database-controlled through `auth.uid()` and excluded from client insert privileges.

3. Matchmaking Notes
- The trade feed compares a post's offered card name or API id against the viewer's wishlist entries.
- A match displays a highlighted badge on the announcement in the Scambi feed.
*/

CREATE TABLE IF NOT EXISTS public.user_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id_api text NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  set_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_wishlist FROM anon, authenticated;
GRANT SELECT, DELETE ON public.user_wishlist TO authenticated;
GRANT INSERT (card_id_api, name, image_url, set_name) ON public.user_wishlist TO authenticated;

DROP POLICY IF EXISTS "select_own_wishlist" ON public.user_wishlist;
CREATE POLICY "select_own_wishlist" ON public.user_wishlist
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wishlist" ON public.user_wishlist;
CREATE POLICY "insert_own_wishlist" ON public.user_wishlist
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_wishlist" ON public.user_wishlist;
CREATE POLICY "delete_own_wishlist" ON public.user_wishlist
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_wishlist_user_id_idx
  ON public.user_wishlist (user_id);

CREATE INDEX IF NOT EXISTS user_wishlist_card_id_api_idx
  ON public.user_wishlist (card_id_api);
