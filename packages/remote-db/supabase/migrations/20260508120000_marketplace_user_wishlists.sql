-- Marketplace wishlist: per-user bookmarks of games for later purchase.
-- Owned by the user; not visible to org admins or staff (it's personal).

-- =============================================================================
-- user_wishlists — composite (user_id, game_id) like purchase authorizations
-- =============================================================================

CREATE TABLE public.user_wishlists (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id)
);

CREATE INDEX user_wishlists_game_id_idx ON public.user_wishlists (game_id);

COMMENT ON TABLE public.user_wishlists IS
  'Marketplace wishlist; per-user bookmarks of games for later purchase.';

-- =============================================================================
-- Privileges (no anon; not part of cloud sync schema)
-- =============================================================================

REVOKE ALL ON TABLE public.user_wishlists FROM PUBLIC;

GRANT SELECT, INSERT, DELETE ON TABLE public.user_wishlists TO authenticated;
GRANT ALL ON TABLE public.user_wishlists TO service_role;

-- =============================================================================
-- RLS — users may only read/write their own rows
-- =============================================================================

ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_wishlists_select ON public.user_wishlists
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_wishlists_insert ON public.user_wishlists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_wishlists_delete ON public.user_wishlists
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
