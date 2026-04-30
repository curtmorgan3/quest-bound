-- Marketplace purchase ledger and entitlements (see marketplace repo plan.md model stubs).
-- Inserts/updates/deletes for v1: service role or backend jobs; clients read via RLS.
-- discount_codes table not yet migrated; discount_code_id is reserved for a future FK.

-- =============================================================================
-- game_purchases — one row per completed purchase (audit / history)
-- =============================================================================

CREATE TABLE public.game_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE RESTRICT,
  discount_code_id uuid,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  price numeric(12, 2) NOT NULL
);

CREATE INDEX game_purchases_user_id_idx ON public.game_purchases (user_id);
CREATE INDEX game_purchases_game_id_idx ON public.game_purchases (game_id);
CREATE INDEX game_purchases_purchased_at_idx ON public.game_purchases (purchased_at DESC);

COMMENT ON TABLE public.game_purchases IS
  'Marketplace purchase ledger; maps plan GamePurchase (userId, gameId, discountCodeId?, timestamp, price).';
COMMENT ON COLUMN public.game_purchases.discount_code_id IS
  'Optional FK to public.discount_codes when that table exists.';

-- =============================================================================
-- user_game_purchase_authorizations — entitlement to access a purchased game
-- =============================================================================

CREATE TABLE public.user_game_purchase_authorizations (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id)
);

CREATE INDEX user_game_purchase_authorizations_game_id_idx
  ON public.user_game_purchase_authorizations (game_id);

COMMENT ON TABLE public.user_game_purchase_authorizations IS
  'Marketplace entitlement; maps plan UserGamePurchaseAuthorization (userId, gameId).';

-- =============================================================================
-- Privileges (no anon; not part of cloud sync schema)
-- =============================================================================

REVOKE ALL ON TABLE public.game_purchases FROM PUBLIC;
REVOKE ALL ON TABLE public.user_game_purchase_authorizations FROM PUBLIC;

GRANT SELECT ON TABLE public.game_purchases TO authenticated;
GRANT SELECT ON TABLE public.user_game_purchase_authorizations TO authenticated;

GRANT ALL ON TABLE public.game_purchases TO service_role;
GRANT ALL ON TABLE public.user_game_purchase_authorizations TO service_role;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.game_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_purchase_authorizations ENABLE ROW LEVEL SECURITY;

-- Purchases: buyer, org admins for that game's org, internal staff.
CREATE POLICY game_purchases_select ON public.game_purchases
  FOR SELECT
  TO authenticated
  USING (
    game_purchases.user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.games AS g
      WHERE g.id = game_purchases.game_id
        AND public.is_organization_admin(g.organization_id)
    )
    OR public.user_is_quest_bound_staff()
  );

CREATE POLICY user_game_purchase_authorizations_select
  ON public.user_game_purchase_authorizations
  FOR SELECT
  TO authenticated
  USING (
    user_game_purchase_authorizations.user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.games AS g
      WHERE g.id = user_game_purchase_authorizations.game_id
        AND public.is_organization_admin(g.organization_id)
    )
    OR public.user_is_quest_bound_staff()
  );
