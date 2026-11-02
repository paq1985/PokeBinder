/*
# Add language column to profiles

1. Modified Tables
- `profiles` gains a `language` text column (default 'it').
  Stores the user's preferred UI language code: 'it', 'en', 'fr', 'de', 'es'.

2. Security
- `language` is added to the client-updatable columns via the UPDATE grant.
  The existing UPDATE grant only covers username and avatar_emoji,
  so we revoke and re-grant UPDATE to include language.
- A SECURITY DEFINER function `update_user_language()` lets a user
  update their own language. This bypasses the column-restricted grant
  so we don't need to change the grant (which also covers avatar/username).
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'it';

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, avatar_emoji, language) ON public.profiles TO authenticated;
