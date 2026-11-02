/*
# Create profiles and notifications tables

1. New Tables
- `profiles` stores user display info for signed-in CardDex users.
  - `id` is the user UUID, matching auth.users(id), as primary key.
  - `username` stores the chosen nickname, unique when non-empty.
  - `avatar_emoji` stores a Pokémon emoji the user picks.
  - `created_at` and `updated_at` for auditing.
- `notifications` stores in-app notifications for signed-in users.
  - `id` is the notification UUID.
  - `user_id` is the recipient and defaults to the authenticated session user.
  - `type` is 'comment' or 'message'.
  - `title` is the notification headline.
  - `content` is the notification body.
  - `is_read` defaults to false.
  - `link_id` references the related post or chat room.
  - `created_at` records when the notification was created.

2. Security
- Row Level Security is enabled on both tables.
- profiles: all authenticated users can read profiles (for display names).
  Only the owner can insert or update their own profile row.
  username and avatar_emoji are the only client-writable columns.
- notifications: each user reads and updates is_read only on their own notifications.
  INSERT is allowed for any authenticated user so the app can create
  notifications destined for other users (comment/message alerts).
- Anonymous users have no Data API access.

3. Important Notes
- A SECURITY DEFINER function auto-creates a profile row when a new auth user signs up.
- The trigger fires AFTER INSERT on auth.users.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT '',
  avatar_emoji text NOT NULL DEFAULT '⭐',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, username, avatar_emoji) ON public.profiles TO authenticated;
GRANT UPDATE (username, avatar_emoji) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "read_profiles" ON public.profiles;
CREATE POLICY "read_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (username)
  WHERE username <> '';

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'comment',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  link_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT INSERT (user_id, type, title, content, link_id) ON public.notifications TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "read_own_notifications" ON public.notifications;
CREATE POLICY "read_own_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications" ON public.notifications;
CREATE POLICY "insert_notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications (user_id, created_at);

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user_profile() TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_profile'
  ) THEN
    CREATE TRIGGER on_auth_user_created_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user_profile();
  END IF;
END $$;
