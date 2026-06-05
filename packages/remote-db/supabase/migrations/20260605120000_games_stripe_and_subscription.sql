-- Add Stripe payment link and subscription-inclusion flag to games.

ALTER TABLE public.games
  ADD COLUMN stripe_storefront_url text,
  ADD COLUMN included_with_subscription boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.games.stripe_storefront_url IS
  'Stripe Payment Link URL shown on the game landing page for one-time purchase.';

COMMENT ON COLUMN public.games.included_with_subscription IS
  'When true, subscribers gain access without a direct purchase.';
