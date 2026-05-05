-- Make games standalone records:
--   * ruleset_id becomes nullable; the composite FK to organization_rulesets is dropped.
--   * org members (not just admins) and quest_bound_staff may delete game rows.
-- INSERT/UPDATE policies remain admin-or-staff (unchanged).

ALTER TABLE public.games DROP CONSTRAINT games_org_ruleset_fk;
ALTER TABLE public.games ALTER COLUMN ruleset_id DROP NOT NULL;

DROP POLICY games_delete_org_admin_or_staff ON public.games;

CREATE POLICY games_delete_org_member_or_staff ON public.games
  FOR DELETE
  TO authenticated
  USING (
    public.is_organization_admin(games.organization_id)
    OR public.user_is_organization_member(games.organization_id)
    OR public.user_is_quest_bound_staff()
  );
