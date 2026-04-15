-- Scope sync_deletes cleanup to ruleset_id; index for pull-by-ruleset.
-- Client pushes tombstones with user_id = ruleset owner + ruleset_id (Phase 4).

CREATE INDEX IF NOT EXISTS idx_sync_deletes_user_ruleset_deleted
  ON public.sync_deletes (user_id, ruleset_id, deleted_at);

CREATE OR REPLACE FUNCTION public.delete_remote_ruleset(p_ruleset_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  asset_paths text[] := ARRAY[]::text[];
  font_paths text[] := ARRAY[]::text[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.rulesets WHERE user_id = uid AND id = p_ruleset_id
  ) THEN
    RAISE EXCEPTION 'Ruleset not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(
    array_agg(a.storage_path) FILTER (WHERE a.storage_path IS NOT NULL),
    ARRAY[]::text[]
  )
  INTO asset_paths
  FROM public.assets AS a
  WHERE a.user_id = uid AND a.ruleset_id = p_ruleset_id;

  SELECT COALESCE(
    array_agg(f.storage_path) FILTER (WHERE f.storage_path IS NOT NULL),
    ARRAY[]::text[]
  )
  INTO font_paths
  FROM public.fonts AS f
  WHERE f.user_id = uid AND f.ruleset_id = p_ruleset_id;

  DELETE FROM public.scene_turn_callbacks
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.campaign_events
  WHERE user_id = uid AND campaign_id IN (
    SELECT c.id FROM public.campaigns AS c
    WHERE c.user_id = uid AND c.ruleset_id = p_ruleset_id
  );

  DELETE FROM public.campaign_characters
  WHERE user_id = uid AND campaign_id IN (
    SELECT c.id FROM public.campaigns AS c
    WHERE c.user_id = uid AND c.ruleset_id = p_ruleset_id
  );

  DELETE FROM public.campaign_scenes
  WHERE user_id = uid AND campaign_id IN (
    SELECT c.id FROM public.campaigns AS c
    WHERE c.user_id = uid AND c.ruleset_id = p_ruleset_id
  );

  DELETE FROM public.documents
  WHERE user_id = uid AND (
    ruleset_id = p_ruleset_id
    OR campaign_id IN (
      SELECT c.id FROM public.campaigns AS c
      WHERE c.user_id = uid AND c.ruleset_id = p_ruleset_id
    )
    OR campaign_scene_id IN (
      SELECT cs.id
      FROM public.campaign_scenes AS cs
      INNER JOIN public.campaigns AS c
        ON c.user_id = cs.user_id AND c.id = cs.campaign_id
      WHERE cs.user_id = uid AND c.ruleset_id = p_ruleset_id
    )
    OR world_id IN (
      SELECT DISTINCT c.world_id
      FROM public.campaigns AS c
      WHERE c.user_id = uid
        AND c.ruleset_id = p_ruleset_id
        AND c.world_id IS NOT NULL
    )
  );

  DELETE FROM public.campaigns
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.inventory_items
  WHERE user_id = uid AND inventory_id IN (
    SELECT i.id FROM public.inventories AS i
    WHERE i.user_id = uid AND i.ruleset_id = p_ruleset_id
  );

  DELETE FROM public.character_archetypes
  WHERE user_id = uid AND character_id IN (
    SELECT ch.id FROM public.characters AS ch
    WHERE ch.user_id = uid AND ch.ruleset_id = p_ruleset_id
  );

  DELETE FROM public.character_windows
  WHERE user_id = uid AND character_id IN (
    SELECT ch.id FROM public.characters AS ch
    WHERE ch.user_id = uid AND ch.ruleset_id = p_ruleset_id
  );

  DELETE FROM public.character_pages
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.character_attributes
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.inventories
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.characters
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.archetype_custom_properties
  WHERE user_id = uid AND archetype_id IN (
    SELECT a.id FROM public.archetypes AS a
    WHERE a.user_id = uid AND a.ruleset_id = p_ruleset_id
  );

  DELETE FROM public.item_custom_properties
  WHERE user_id = uid AND item_id IN (
    SELECT it.id FROM public.items AS it
    WHERE it.user_id = uid AND it.ruleset_id = p_ruleset_id
  );

  DELETE FROM public.script_logs
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.dependency_graph_nodes
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.dice_rolls
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.custom_properties
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.ruleset_windows
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.pages
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.components
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.scripts
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.charts
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.actions
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.attributes
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.items
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.archetypes
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.assets
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.fonts
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.windows
  WHERE user_id = uid AND ruleset_id = p_ruleset_id;

  DELETE FROM public.sync_deletes
  WHERE user_id = uid
    AND (
      (table_name = 'rulesets' AND entity_id = p_ruleset_id)
      OR ruleset_id = p_ruleset_id
    );

  DELETE FROM public.rulesets
  WHERE user_id = uid AND id = p_ruleset_id;

  RETURN jsonb_build_object(
    'assetPaths', COALESCE(to_jsonb(asset_paths), '[]'::jsonb),
    'fontPaths', COALESCE(to_jsonb(font_paths), '[]'::jsonb)
  );
END;
$$;
