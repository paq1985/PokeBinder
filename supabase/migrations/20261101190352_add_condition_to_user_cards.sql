/*
# Add card condition and adjusted collection prices

1. Modified Table
- `user_cards.condition` stores the selected conservation state.
- Allowed values are exactly `Mint`, `Near Mint`, and `Played`.
- Existing saved cards receive `Near Mint` as their neutral default.

2. Access Changes
- Authenticated users can insert the new condition field when saving their own cards.
- Authenticated users can update the condition of cards they own through the existing owner policy.
- No anonymous access is added.

3. Important Notes
- `market_price` continues to store the adjusted price shown for the selected condition.
- Price adjustment is calculated in the app from the API market price: Mint 100%, Near Mint 85%, Played 60%.
- Existing rows are preserved and remain available in the collection.
*/

ALTER TABLE public.user_cards
  ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'Near Mint';

ALTER TABLE public.user_cards
  DROP CONSTRAINT IF EXISTS user_cards_condition_check;

ALTER TABLE public.user_cards
  ADD CONSTRAINT user_cards_condition_check
  CHECK (condition IN ('Mint', 'Near Mint', 'Played'));

GRANT INSERT (card_id_api, name, image_url, set_name, market_price, condition) ON public.user_cards TO authenticated;
GRANT UPDATE (condition, market_price) ON public.user_cards TO authenticated;
