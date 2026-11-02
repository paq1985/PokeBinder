/*
# Tighten user_cards Data API privileges

1. Scope
- Updates the existing `public.user_cards` table permissions only.
- No rows or columns are deleted or changed.

2. Access Changes
- Removes all accidental/default Data API privileges from `anon`.
- Removes broad privileges from `authenticated`.
- Restores only SELECT and DELETE for authenticated users.
- Restores INSERT only for `card_id_api`, `name`, `image_url`, `set_name`, and `market_price`.

3. Security Notes
- RLS policies remain the source of row ownership checks through `auth.uid()`.
- The `user_id` and `id` columns remain outside the client insert grant and continue to be controlled by database defaults.
- The update policy remains defined but no client update grant is provided because the current app does not edit saved cards.
*/

REVOKE ALL ON public.user_cards FROM anon, authenticated;

GRANT SELECT, DELETE ON public.user_cards TO authenticated;
GRANT INSERT (card_id_api, name, image_url, set_name, market_price) ON public.user_cards TO authenticated;
