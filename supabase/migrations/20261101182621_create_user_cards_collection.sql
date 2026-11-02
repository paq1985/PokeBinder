/*
# Create user_cards collection table

1. New Tables
- `user_cards` stores one saved Pokémon TCG card per row.
- `id` is the internal UUID for the saved collection entry.
- `user_id` identifies the signed-in owner and defaults to the current authenticated user.
- `card_id_api` stores the Pokémon TCG API card identifier.
- `name` stores the card name shown in the collection.
- `image_url` stores the official card image URL.
- `set_name` stores the expansion or set name.
- `market_price` stores the current market price used for the collection total.
- `created_at` records when the card was added.

2. Security
- Row Level Security is enabled on `user_cards`.
- Only authenticated users receive Data API access.
- Select, insert, update, and delete policies are all restricted to rows owned by `auth.uid()`.
- The owner is assigned by the database session default rather than trusted client input.
- Insert permissions are limited to the card fields required by the app; ownership and identity fields cannot be forged through a normal insert.

3. Important Notes
- The table is intentionally owner-scoped: users cannot read or modify another user's collection.
- The app currently adds cards and reads the collection; update and delete policies are included for a complete owner-scoped CRUD contract without granting unnecessary client verbs today.
*/

CREATE TABLE IF NOT EXISTS public.user_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id_api text NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  set_name text NOT NULL,
  market_price numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

GRANT SELECT, DELETE ON public.user_cards TO authenticated;
GRANT INSERT (card_id_api, name, image_url, set_name, market_price) ON public.user_cards TO authenticated;

DROP POLICY IF EXISTS "select_own_user_cards" ON public.user_cards;
CREATE POLICY "select_own_user_cards" ON public.user_cards
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_cards" ON public.user_cards;
CREATE POLICY "insert_own_user_cards" ON public.user_cards
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_cards" ON public.user_cards;
CREATE POLICY "update_own_user_cards" ON public.user_cards
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_cards" ON public.user_cards;
CREATE POLICY "delete_own_user_cards" ON public.user_cards
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_cards_user_id_created_at_idx
  ON public.user_cards (user_id, created_at DESC);
