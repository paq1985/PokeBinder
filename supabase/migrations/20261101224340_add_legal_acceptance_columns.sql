/*
# Add accepted_privacy and accepted_terms to profiles

1. Modified Tables
- `profiles` gains two boolean columns:
  - `accepted_privacy` (default false) — user accepted the Privacy Policy (GDPR).
  - `accepted_terms` (default false) — user accepted the Terms of Service / disclaimer.

2. Security
- These columns are NOT client-writable via the normal UPDATE grant.
- The existing UPDATE grant only covers username and avatar_emoji
  (set in the earlier ban-system migration), so accepted_privacy and
  accepted_terms are excluded from client updates.
- A SECURITY DEFINER function `accept_legal_terms()` lets a user set
  both flags to true on their own profile after signup. Only the owner
  can call it (auth.uid() = p_user_id). This prevents users from
  un-accepting terms.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_privacy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_terms boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.accept_legal_terms(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET accepted_privacy = true,
      accepted_terms = true,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_legal_terms(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_legal_terms(uuid) TO authenticated;
