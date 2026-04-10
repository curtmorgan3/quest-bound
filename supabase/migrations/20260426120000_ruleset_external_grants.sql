-- External ruleset grants (playtesters): org admins grant non-members read_only or full access
-- to org-linked rulesets. Grantees can install and read owner-partition data; they are not cloud
-- collaborators (no remote INSERT/UPDATE/DELETE on owner rows; sync UI disabled).
--
-- Pending grants use invitee_email_normalized; active grants set user_id to auth user.
-- Resolution: trigger on public.users AFTER INSERT OR UPDATE OF email matches normalized primary email
-- to pending rows (same spirit as organization_invites).
--
-- SELECT on synced tables uses read_authorized_for_owner_ruleset = org collaborator OR active external grant.
-- INSERT/UPDATE/DELETE policies keep is_org_collaborator_for_owner_ruleset only (never external grant).

-- =============================================================================
-- Table: ruleset_external_grants
-- =============================================================================

CREATE TABLE public.ruleset_external_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  ruleset_id text NOT NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  invitee_email_normalized text NOT NULL,
  permission text NOT NULL CHECK (permission IN ('read_only', 'full')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ruleset_external_grants_org_ruleset_fk
    FOREIGN KEY (organization_id, ruleset_id)
    REFERENCES public.organization_rulesets (organization_id, ruleset_id)
    ON DELETE CASCADE
);

COMMENT ON TABLE public.ruleset_external_grants IS
  'Org admin grants external (non-member) access to an org-linked ruleset; resolved by primary email on public.users.';

CREATE INDEX ruleset_external_grants_user_idx
  ON public.ruleset_external_grants (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX ruleset_external_grants_org_ruleset_idx
  ON public.ruleset_external_grants (organization_id, ruleset_id);

-- At most one active pending grant per org + ruleset + email
CREATE UNIQUE INDEX ruleset_external_grants_active_pending_email_uidx
  ON public.ruleset_external_grants (organization_id, ruleset_id, invitee_email_normalized)
  WHERE is_active AND user_id IS NULL;

-- At most one active resolved grant per org + ruleset + user
CREATE UNIQUE INDEX ruleset_external_grants_active_user_uidx
  ON public.ruleset_external_grants (organization_id, ruleset_id, user_id)
  WHERE is_active AND user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ruleset_external_grants_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ruleset_external_grants_updated_at_trg
  BEFORE UPDATE ON public.ruleset_external_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.ruleset_external_grants_set_updated_at();

-- =============================================================================
-- Resolve pending grants when public.users email is set (primary email)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_ruleset_external_grants_on_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  norm text;
BEGIN
  norm := lower(trim(COALESCE(NEW.email, '')));
  IF norm = '' THEN
    RETURN NEW;
  END IF;
  UPDATE public.ruleset_external_grants AS g
  SET user_id = NEW.user_id,
      updated_at = now()
  WHERE g.is_active
    AND g.user_id IS NULL
    AND g.invitee_email_normalized = norm;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_resolve_ruleset_external_grants_trg
  AFTER INSERT OR UPDATE OF email ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_ruleset_external_grants_on_user_email();

COMMENT ON FUNCTION public.resolve_ruleset_external_grants_on_user_email() IS
  'Sets user_id on active pending ruleset_external_grants when public.users primary email matches invitee_email_normalized.';

-- =============================================================================
-- Helpers: external grant read + combined SELECT authorization
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_has_active_external_ruleset_grant(
  p_owner_user_id uuid,
  p_ruleset_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ruleset_external_grants AS g
    INNER JOIN public.organization_rulesets AS o
      ON o.organization_id = g.organization_id
      AND o.ruleset_id = g.ruleset_id
    WHERE g.is_active
      AND g.user_id = (SELECT auth.uid())
      AND o.owner_user_id = p_owner_user_id
      AND o.ruleset_id = p_ruleset_id
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_active_external_ruleset_grant(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_active_external_ruleset_grant(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.read_authorized_for_owner_ruleset(
  p_owner_user_id uuid,
  p_ruleset_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_collaborator_for_owner_ruleset(p_owner_user_id, p_ruleset_id)
    OR public.user_has_active_external_ruleset_grant(p_owner_user_id, p_ruleset_id);
$$;

REVOKE ALL ON FUNCTION public.read_authorized_for_owner_ruleset(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_authorized_for_owner_ruleset(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.read_authorized_for_owner_ruleset(uuid, text) IS
  'RLS SELECT helper: org collaborator OR active external grant (read_only/full) for owner partition.';

-- =============================================================================
-- RLS: ruleset_external_grants
-- =============================================================================

ALTER TABLE public.ruleset_external_grants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ruleset_external_grants FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ruleset_external_grants TO authenticated;

CREATE POLICY ruleset_external_grants_select_admin ON public.ruleset_external_grants
  FOR SELECT
  USING (public.is_organization_admin(organization_id));

CREATE POLICY ruleset_external_grants_select_grantee ON public.ruleset_external_grants
  FOR SELECT
  USING (
    is_active
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY ruleset_external_grants_insert_admin ON public.ruleset_external_grants
  FOR INSERT
  WITH CHECK (public.is_organization_admin(organization_id));

CREATE POLICY ruleset_external_grants_update_admin ON public.ruleset_external_grants
  FOR UPDATE
  USING (public.is_organization_admin(organization_id))
  WITH CHECK (public.is_organization_admin(organization_id));

CREATE POLICY ruleset_external_grants_delete_admin ON public.ruleset_external_grants
  FOR DELETE
  USING (public.is_organization_admin(organization_id));

-- =============================================================================
-- Storage: org ruleset paths — allow external grantees read-only path access (SELECT policies only)
-- =============================================================================

DROP FUNCTION IF EXISTS public.storage_org_ruleset_path_allowed(text, boolean);

CREATE OR REPLACE FUNCTION public.storage_org_ruleset_path_allowed(
  p_name text,
  p_require_admin boolean,
  p_allow_external_grant_read boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  org_uuid uuid;
  rsid text;
  is_admin boolean;
  is_member boolean;
BEGIN
  parts := string_to_array(nullif(trim(p_name), ''), '/');
  IF parts IS NULL OR array_length(parts, 1) IS NULL OR array_length(parts, 1) < 3 THEN
    RETURN false;
  END IF;
  BEGIN
    org_uuid := parts[1]::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN false;
  END;
  rsid := parts[2];
  SELECT
    (org.admin_user_id = (SELECT auth.uid())),
    EXISTS (
      SELECT 1
      FROM public.organization_members AS m
      WHERE m.organization_id = org.id AND m.user_id = (SELECT auth.uid())
    )
  INTO is_admin, is_member
  FROM public.organizations AS org
  WHERE org.id = org_uuid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_require_admin AND NOT is_admin THEN
    RETURN false;
  END IF;

  IF NOT p_require_admin AND NOT is_admin AND NOT is_member THEN
    IF p_allow_external_grant_read
      AND EXISTS (
        SELECT 1
        FROM public.organization_rulesets AS o
        INNER JOIN public.ruleset_external_grants AS g
          ON g.organization_id = o.organization_id
          AND g.ruleset_id = o.ruleset_id
        WHERE o.organization_id = org_uuid
          AND o.ruleset_id = rsid
          AND g.is_active
          AND g.user_id = (SELECT auth.uid())
      )
    THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.organization_rulesets AS o
    WHERE o.organization_id = org_uuid
      AND o.ruleset_id = rsid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.storage_org_ruleset_path_allowed(text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_org_ruleset_path_allowed(text, boolean, boolean) TO authenticated;

DROP POLICY IF EXISTS "User reads own assets" ON storage.objects;
CREATE POLICY "User reads own assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assets'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false, true)
    OR public.storage_org_logo_path_allowed(name, false)
  )
);

DROP POLICY IF EXISTS "User reads own fonts" ON storage.objects;
CREATE POLICY "User reads own fonts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false, true)
  )
);

-- =============================================================================
-- Synced tables: extend SELECT policies (collaborator OR external grant read)
-- =============================================================================

DROP POLICY IF EXISTS "Users can select own rows" ON public.rulesets;


CREATE POLICY "Users can select own rows" ON public.rulesets
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.attributes;


CREATE POLICY "Users can select own rows" ON public.attributes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.actions;


CREATE POLICY "Users can select own rows" ON public.actions
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.items;


CREATE POLICY "Users can select own rows" ON public.items
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.charts;


CREATE POLICY "Users can select own rows" ON public.charts
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.documents;


CREATE POLICY "Users can select own rows" ON public.documents
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.assets;


CREATE POLICY "Users can select own rows" ON public.assets
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.fonts;


CREATE POLICY "Users can select own rows" ON public.fonts
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.windows;


CREATE POLICY "Users can select own rows" ON public.windows
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.components;


CREATE POLICY "Users can select own rows" ON public.components
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.characters;


CREATE POLICY "Users can select own rows" ON public.characters
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.character_attributes;


CREATE POLICY "Users can select own rows" ON public.character_attributes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.pages;


CREATE POLICY "Users can select own rows" ON public.pages
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.character_pages;


CREATE POLICY "Users can select own rows" ON public.character_pages
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.character_windows;


CREATE POLICY "Users can select own rows" ON public.character_windows
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_windows.user_id
          AND c.id = character_windows.character_id
          AND public.read_authorized_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.ruleset_windows;


CREATE POLICY "Users can select own rows" ON public.ruleset_windows
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.inventories;


CREATE POLICY "Users can select own rows" ON public.inventories
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.inventory_items;


CREATE POLICY "Users can select own rows" ON public.inventory_items
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.inventories AS i
        WHERE i.user_id = inventory_items.user_id
          AND i.id = inventory_items.inventory_id
          AND public.read_authorized_for_owner_ruleset(i.user_id, i.ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.dice_rolls;


CREATE POLICY "Users can select own rows" ON public.dice_rolls
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.scripts;


CREATE POLICY "Users can select own rows" ON public.scripts
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.script_logs;


CREATE POLICY "Users can select own rows" ON public.script_logs
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.dependency_graph_nodes;


CREATE POLICY "Users can select own rows" ON public.dependency_graph_nodes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.archetypes;


CREATE POLICY "Users can select own rows" ON public.archetypes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.character_archetypes;


CREATE POLICY "Users can select own rows" ON public.character_archetypes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_archetypes.user_id
          AND c.id = character_archetypes.character_id
          AND public.read_authorized_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.custom_properties;


CREATE POLICY "Users can select own rows" ON public.custom_properties
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.archetype_custom_properties;


CREATE POLICY "Users can select own rows" ON public.archetype_custom_properties
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.archetypes AS a
        WHERE a.user_id = archetype_custom_properties.user_id
          AND a.id = archetype_custom_properties.archetype_id
          AND public.read_authorized_for_owner_ruleset(a.user_id, a.ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.item_custom_properties;


CREATE POLICY "Users can select own rows" ON public.item_custom_properties
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.items AS it
        WHERE it.user_id = item_custom_properties.user_id
          AND it.id = item_custom_properties.item_id
          AND public.read_authorized_for_owner_ruleset(it.user_id, it.ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.campaigns;


CREATE POLICY "Users can select own rows" ON public.campaigns
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.campaign_characters;


CREATE POLICY "Users can select own rows" ON public.campaign_characters
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_characters.user_id
          AND c.id = campaign_characters.campaign_id
          AND public.read_authorized_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.campaign_scenes;


CREATE POLICY "Users can select own rows" ON public.campaign_scenes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_scenes.user_id
          AND c.id = campaign_scenes.campaign_id
          AND public.read_authorized_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.scene_turn_callbacks;


CREATE POLICY "Users can select own rows" ON public.scene_turn_callbacks
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.campaign_events;


CREATE POLICY "Users can select own rows" ON public.campaign_events
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_events.user_id
          AND c.id = campaign_events.campaign_id
          AND public.read_authorized_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.sync_deletes;


CREATE POLICY "Users can select own rows" ON public.sync_deletes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );

-- =============================================================================
-- composites / composite_variants (added after organizations_phase1)
-- =============================================================================

DROP POLICY IF EXISTS "Users can select own rows" ON public.composites;
CREATE POLICY "Users can select own rows" ON public.composites
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );

DROP POLICY IF EXISTS "Users can select own rows" ON public.composite_variants;
CREATE POLICY "Users can select own rows" ON public.composite_variants
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.read_authorized_for_owner_ruleset(user_id, ruleset_id)
    )
  );
