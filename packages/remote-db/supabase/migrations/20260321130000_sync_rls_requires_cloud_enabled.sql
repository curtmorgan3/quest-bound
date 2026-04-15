-- Gate all cloud sync (PostgREST) on public.users.cloud_enabled = true for the current auth user.
-- Uses a SECURITY DEFINER helper so checking public.users does not recurse through RLS.
-- Bootstrap: INSERT into public.users remains allowed with only user_id = auth.uid() so the first
-- profile row can be created; further reads/writes on users (and all other synced tables) require
-- an existing row with cloud_enabled IS TRUE (set in the Supabase dashboard).

CREATE OR REPLACE FUNCTION public.sync_is_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = (SELECT auth.uid())
      AND u.cloud_enabled IS TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.sync_is_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_is_allowed() TO authenticated, anon, service_role;

-- Replace standard policies on every synced table except users.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'rulesets',
    'attributes',
    'actions',
    'items',
    'charts',
    'documents',
    'assets',
    'fonts',
    'windows',
    'components',
    'characters',
    'character_attributes',
    'pages',
    'character_pages',
    'character_windows',
    'ruleset_windows',
    'inventories',
    'inventory_items',
    'dice_rolls',
    'scripts',
    'script_logs',
    'dependency_graph_nodes',
    'archetypes',
    'character_archetypes',
    'custom_properties',
    'archetype_custom_properties',
    'item_custom_properties',
    'campaigns',
    'campaign_characters',
    'campaign_scenes',
    'scene_turn_callbacks',
    'campaign_events',
    'sync_deletes'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can select own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own rows" ON public.%I', t);

    EXECUTE format(
      'CREATE POLICY "Users can select own rows" ON public.%I FOR SELECT USING (user_id = auth.uid() AND public.sync_is_allowed())',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Users can insert own rows" ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid() AND public.sync_is_allowed())',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Users can update own rows" ON public.%I FOR UPDATE USING (user_id = auth.uid() AND public.sync_is_allowed()) WITH CHECK (user_id = auth.uid() AND public.sync_is_allowed())',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Users can delete own rows" ON public.%I FOR DELETE USING (user_id = auth.uid() AND public.sync_is_allowed())',
      t
    );
  END LOOP;
END;
$$;

-- users: allow first-time INSERT without sync_is_allowed; all other ops require it.
DROP POLICY IF EXISTS "Users can select own rows" ON public.users;
DROP POLICY IF EXISTS "Users can insert own rows" ON public.users;
DROP POLICY IF EXISTS "Users can update own rows" ON public.users;
DROP POLICY IF EXISTS "Users can delete own rows" ON public.users;

CREATE POLICY "Users can insert own rows" ON public.users
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can select own rows" ON public.users
  FOR SELECT
  USING (user_id = auth.uid() AND public.sync_is_allowed());

CREATE POLICY "Users can update own rows" ON public.users
  FOR UPDATE
  USING (user_id = auth.uid() AND public.sync_is_allowed())
  WITH CHECK (user_id = auth.uid() AND public.sync_is_allowed());

CREATE POLICY "Users can delete own rows" ON public.users
  FOR DELETE
  USING (user_id = auth.uid() AND public.sync_is_allowed());
