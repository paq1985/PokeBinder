/*
# Create trade comments table

1. New Table
- `trade_comments` stores public comments left by signed-in users under a trade announcement.
- `id` is the comment UUID.
- `post_id` references the parent trade post and cascades on deletion.
- `user_id` identifies the comment author and defaults to the authenticated session user.
- `user_name` stores the display name shown next to the comment.
- `comment_text` stores the comment body.
- `created_at` records when the comment was posted.

2. Security
- Row Level Security is enabled.
- All authenticated users can read comments (shared feed context).
- Only the author can delete their own comment.
- Anonymous users have no Data API access.
- The owner column is database-controlled through `auth.uid()` and excluded from client insert privileges.

3. Important Notes
- No UPDATE policy: comments cannot be edited after posting.
- The comment counter in the UI reflects the real number of rows for each post.
*/

CREATE TABLE IF NOT EXISTS public.trade_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.trade_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.trade_comments FROM anon, authenticated;
GRANT SELECT ON public.trade_comments TO authenticated;
GRANT INSERT (post_id, user_name, comment_text) ON public.trade_comments TO authenticated;
GRANT DELETE ON public.trade_comments TO authenticated;

DROP POLICY IF EXISTS "read_trade_comments" ON public.trade_comments;
CREATE POLICY "read_trade_comments" ON public.trade_comments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_own_trade_comments" ON public.trade_comments;
CREATE POLICY "insert_own_trade_comments" ON public.trade_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_trade_comments" ON public.trade_comments;
CREATE POLICY "delete_own_trade_comments" ON public.trade_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS trade_comments_post_id_idx
  ON public.trade_comments (post_id, created_at);
