/*
# Add card condition, set name, and market price to trade_posts

1. Modified Table
- `trade_posts.card_condition` stores the conservation state of the offered card (Mint, Near Mint, Played).
- `trade_posts.card_set_name` stores the expansion/set name of the offered card.
- `trade_posts.card_market_price` stores the market price of the offered card at the time of posting.
- All three columns default sensibly so existing rows are unaffected.

2. Access Changes
- Authenticated INSERT now includes card_condition, card_set_name, card_market_price.
- Authenticated UPDATE now includes the same three columns.

3. Important Notes
- These columns are populated automatically from the user's saved collection (user_cards) when creating a trade post.
- No data is lost; existing posts get 'Near Mint' as condition, empty set name, and 0 price.
*/

ALTER TABLE public.trade_posts
  ADD COLUMN IF NOT EXISTS card_condition text NOT NULL DEFAULT 'Near Mint';

ALTER TABLE public.trade_posts
  DROP CONSTRAINT IF EXISTS trade_posts_card_condition_check;
ALTER TABLE public.trade_posts
  ADD CONSTRAINT trade_posts_card_condition_check
  CHECK (card_condition IN ('Mint', 'Near Mint', 'Played'));

ALTER TABLE public.trade_posts
  ADD COLUMN IF NOT EXISTS card_set_name text NOT NULL DEFAULT '';

ALTER TABLE public.trade_posts
  ADD COLUMN IF NOT EXISTS card_market_price numeric(12, 2) NOT NULL DEFAULT 0;

REVOKE ALL ON public.trade_posts FROM anon, authenticated;
GRANT SELECT, DELETE ON public.trade_posts TO authenticated;
GRANT INSERT (card_name, card_image_url, wanted_card_name, note, latitude, longitude, card_condition, card_set_name, card_market_price) ON public.trade_posts TO authenticated;
GRANT UPDATE (card_name, card_image_url, wanted_card_name, note, latitude, longitude, card_condition, card_set_name, card_market_price) ON public.trade_posts TO authenticated;