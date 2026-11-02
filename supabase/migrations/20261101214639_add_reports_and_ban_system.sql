/*
# Add reports table, is_banned column, and ban-aware RLS policies

1. New Tables
- `reports` stores user-submitted reports for moderation.
  - `id` is the report UUID.
  - `reporter_id` is the user submitting the report (defaults to auth.uid()).
  - `reported_user_id` is the user being reported.
  - `content_type` is 'post' or 'chat'.
  - `content_id` is the ID of the reported post or chat room.
  - `reason` is one of: 'Linguaggio offensivo', 'Truffa', 'Altro'.
  - `description` is optional additional context.
  - `ai_checked` (boolean, default false) for future AI moderation.
  - `ai_score` (integer, nullable) for future AI severity scoring.
  - `ai_verdict` (text, nullable) for future AI verdict.
  - `created_at` records when the report was filed.

2. Modified Tables
- `profiles` gains `is_banned` boolean column (default false).
  This column is NOT client-writable — only service_role can set it.
  The UPDATE grant on profiles excludes is_banned so users cannot self-ban or unban.

3. Security Changes
- `reports`: INSERT-only for authenticated users (no SELECT/UPDATE/DELETE).
  Users can file reports but cannot read other users' reports (privacy).
  Only service_role can read and manage reports.
- `profiles` SELECT policy unchanged (all authenticated can read).
  UPDATE policy unchanged (owner can update username/avatar only).
  is_banned is excluded from the client UPDATE grant.
- `user_cards`, `trade_posts`, `trade_comments`, `chat_messages`:
  INSERT and UPDATE policies now check that the user's profile.is_banned = false.
  Banned users can still READ data but cannot write.
*/

-- ── reports table ──
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL DEFAULT 'post',
  content_id text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT 'Altro',
  description text NOT NULL DEFAULT '',
  ai_checked boolean NOT NULL DEFAULT false,
  ai_score integer,
  ai_verdict text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.reports FROM anon, authenticated;
GRANT INSERT (reporter_id, reported_user_id, content_type, content_id, reason, description) ON public.reports TO authenticated;

DROP POLICY IF EXISTS "insert_reports" ON public.reports;
CREATE POLICY "insert_reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- ── is_banned column on profiles ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Ensure is_banned is NOT client-updatable: revoke full UPDATE, grant only username+avatar_emoji
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, avatar_emoji) ON public.profiles TO authenticated;

-- ── Ban-aware RLS for user_cards ──
DROP POLICY IF EXISTS "insert_own_cards" ON public.user_cards;
CREATE POLICY "insert_own_cards" ON public.user_cards
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

DROP POLICY IF EXISTS "update_own_cards" ON public.user_cards;
CREATE POLICY "update_own_cards" ON public.user_cards
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

-- ── Ban-aware RLS for trade_posts ──
DROP POLICY IF EXISTS "insert_own_posts" ON public.trade_posts;
CREATE POLICY "insert_own_posts" ON public.trade_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

DROP POLICY IF EXISTS "update_own_posts" ON public.trade_posts;
CREATE POLICY "update_own_posts" ON public.trade_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

-- ── Ban-aware RLS for trade_comments ──
DROP POLICY IF EXISTS "insert_own_comments" ON public.trade_comments;
CREATE POLICY "insert_own_comments" ON public.trade_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

DROP POLICY IF EXISTS "update_own_comments" ON public.trade_comments;
CREATE POLICY "update_own_comments" ON public.trade_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

-- ── Ban-aware RLS for chat_messages ──
DROP POLICY IF EXISTS "insert_own_messages" ON public.chat_messages;
CREATE POLICY "insert_own_messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

DROP POLICY IF EXISTS "update_own_messages" ON public.chat_messages;
CREATE POLICY "update_own_messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

-- ── Ban-aware RLS for user_wishlist ──
DROP POLICY IF EXISTS "insert_own_wishlist" ON public.user_wishlist;
CREATE POLICY "insert_own_wishlist" ON public.user_wishlist
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

DROP POLICY IF EXISTS "update_own_wishlist" ON public.user_wishlist;
CREATE POLICY "update_own_wishlist" ON public.user_wishlist
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );
