-- Quest Bound Phase 1: Remote sync schema
-- 32 synced tables (Dexie minus script_errors) + sync_deletes
-- All tables: composite PK (user_id, id), RLS, indexes.
-- Columns use snake_case; sync layer maps to/from camelCase.

-- =============================================================================
-- Helper: RLS policies (same pattern for every table)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.apply_rls_policies(tab text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tab);
  EXECUTE format('CREATE POLICY "Users can select own rows" ON %I FOR SELECT USING (user_id = auth.uid())', tab);
  EXECUTE format('CREATE POLICY "Users can insert own rows" ON %I FOR INSERT WITH CHECK (user_id = auth.uid())', tab);
  EXECUTE format('CREATE POLICY "Users can update own rows" ON %I FOR UPDATE USING (user_id = auth.uid())', tab);
  EXECUTE format('CREATE POLICY "Users can delete own rows" ON %I FOR DELETE USING (user_id = auth.uid())', tab);
END;
$$;

-- =============================================================================
-- users
-- =============================================================================
CREATE TABLE public.users (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  username   TEXT NOT NULL,
  email      TEXT,
  asset_id   TEXT,
  image      TEXT,
  preferences JSONB NOT NULL DEFAULT '{}',
  cloud_user_id TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('users');
CREATE INDEX idx_users_updated ON public.users (user_id, updated_at);

-- =============================================================================
-- rulesets
-- =============================================================================
CREATE TABLE public.rulesets (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version    TEXT NOT NULL,
  created_by TEXT NOT NULL,
  title      TEXT NOT NULL,
  description TEXT NOT NULL,
  details    JSONB NOT NULL DEFAULT '{}',
  asset_id   TEXT,
  palette    JSONB NOT NULL DEFAULT '[]',
  is_module  BOOLEAN DEFAULT false,
  modules    JSONB,
  characters_cta_asset_id TEXT,
  campaigns_cta_asset_id  TEXT,
  character_cta_title    TEXT,
  character_cta_description TEXT,
  campaigns_cta_title    TEXT,
  campaign_cta_description TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('rulesets');
CREATE INDEX idx_rulesets_user_updated ON public.rulesets (user_id, updated_at);

-- =============================================================================
-- attributes
-- =============================================================================
CREATE TABLE public.attributes (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  title      TEXT NOT NULL,
  description TEXT NOT NULL,
  category   TEXT,
  type       TEXT NOT NULL,
  options    JSONB,
  default_value TEXT,
  options_chart_ref BIGINT,
  options_chart_column_header TEXT,
  allow_multi_select BOOLEAN,
  min        DOUBLE PRECISION,
  max        DOUBLE PRECISION,
  asset_id   TEXT,
  inventory_width INTEGER,
  inventory_height INTEGER,
  script_id  TEXT,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('attributes');
CREATE INDEX idx_attributes_user_ruleset ON public.attributes (user_id, ruleset_id);
CREATE INDEX idx_attributes_updated ON public.attributes (user_id, updated_at);

-- =============================================================================
-- actions
-- =============================================================================
CREATE TABLE public.actions (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  title      TEXT NOT NULL,
  description TEXT NOT NULL,
  category   TEXT,
  asset_id   TEXT,
  inventory_width INTEGER,
  inventory_height INTEGER,
  script_id  TEXT,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('actions');
CREATE INDEX idx_actions_user_ruleset ON public.actions (user_id, ruleset_id);
CREATE INDEX idx_actions_updated ON public.actions (user_id, updated_at);

-- =============================================================================
-- items
-- =============================================================================
CREATE TABLE public.items (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  title      TEXT NOT NULL,
  description TEXT NOT NULL,
  category   TEXT,
  weight     DOUBLE PRECISION NOT NULL,
  default_quantity INTEGER NOT NULL,
  stack_size INTEGER NOT NULL,
  is_container BOOLEAN NOT NULL,
  is_storable BOOLEAN NOT NULL,
  is_equippable BOOLEAN NOT NULL,
  is_consumable BOOLEAN NOT NULL,
  inventory_width INTEGER NOT NULL,
  inventory_height INTEGER NOT NULL,
  asset_id   TEXT,
  script_id  TEXT,
  action_ids JSONB,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  sprites    JSONB,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('items');
CREATE INDEX idx_items_user_ruleset ON public.items (user_id, ruleset_id);
CREATE INDEX idx_items_updated ON public.items (user_id, updated_at);

-- =============================================================================
-- charts
-- =============================================================================
CREATE TABLE public.charts (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  title      TEXT NOT NULL,
  description TEXT NOT NULL,
  category   TEXT,
  data       TEXT NOT NULL,
  asset_id   TEXT,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('charts');
CREATE INDEX idx_charts_user_ruleset ON public.charts (user_id, ruleset_id);
CREATE INDEX idx_charts_updated ON public.charts (user_id, updated_at);

-- =============================================================================
-- documents
-- =============================================================================
CREATE TABLE public.documents (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT,
  world_id   TEXT,
  campaign_id TEXT,
  campaign_scene_id TEXT,
  title      TEXT NOT NULL,
  description TEXT NOT NULL,
  category   TEXT,
  asset_id   TEXT,
  pdf_asset_id TEXT,
  pdf_data   TEXT,
  markdown_data TEXT,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('documents');
CREATE INDEX idx_documents_user_ruleset ON public.documents (user_id, ruleset_id);
CREATE INDEX idx_documents_updated ON public.documents (user_id, updated_at);

-- =============================================================================
-- assets (includes storage_path for Supabase Storage)
-- =============================================================================
CREATE TABLE public.assets (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT,
  filename   TEXT NOT NULL,
  data       TEXT,
  type       TEXT NOT NULL,
  category   TEXT,
  storage_path TEXT,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('assets');
CREATE INDEX idx_assets_user_ruleset ON public.assets (user_id, ruleset_id);
CREATE INDEX idx_assets_updated ON public.assets (user_id, updated_at);

-- =============================================================================
-- fonts
-- =============================================================================
CREATE TABLE public.fonts (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  label      TEXT NOT NULL,
  data       TEXT NOT NULL,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('fonts');
CREATE INDEX idx_fonts_user_ruleset ON public.fonts (user_id, ruleset_id);
CREATE INDEX idx_fonts_updated ON public.fonts (user_id, updated_at);

-- =============================================================================
-- windows
-- =============================================================================
CREATE TABLE public.windows (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  title      TEXT NOT NULL,
  category   TEXT,
  description TEXT,
  hide_from_player_view BOOLEAN,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('windows');
CREATE INDEX idx_windows_user_ruleset ON public.windows (user_id, ruleset_id);
CREATE INDEX idx_windows_updated ON public.windows (user_id, updated_at);

-- =============================================================================
-- components
-- =============================================================================
CREATE TABLE public.components (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  window_id  TEXT NOT NULL,
  type       TEXT NOT NULL,
  x          DOUBLE PRECISION NOT NULL,
  y          DOUBLE PRECISION NOT NULL,
  z          INTEGER NOT NULL,
  height     DOUBLE PRECISION NOT NULL,
  width      DOUBLE PRECISION NOT NULL,
  rotation   DOUBLE PRECISION NOT NULL,
  data       TEXT NOT NULL,
  style      TEXT NOT NULL,
  locked     BOOLEAN,
  group_id   TEXT,
  attribute_id TEXT,
  action_id  TEXT,
  child_window_id TEXT,
  script_id  TEXT,
  asset_id   TEXT,
  asset_url  TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('components');
CREATE INDEX idx_components_user_ruleset ON public.components (user_id, ruleset_id);
CREATE INDEX idx_components_updated ON public.components (user_id, updated_at);

-- =============================================================================
-- characters
-- =============================================================================
CREATE TABLE public.characters (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  user_id_local TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  asset_id   TEXT,
  is_test_character BOOLEAN NOT NULL,
  is_npc     BOOLEAN,
  component_data JSONB NOT NULL DEFAULT '{}',
  pinned_sidebar_documents JSONB NOT NULL DEFAULT '[]',
  pinned_sidebar_charts JSONB NOT NULL DEFAULT '[]',
  pinned_inventory_item_ids JSONB,
  last_viewed_page_id TEXT,
  sheet_locked BOOLEAN,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  custom_properties JSONB,
  component_style_overrides JSONB,
  last_synced_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('characters');
CREATE INDEX idx_characters_user_ruleset ON public.characters (user_id, ruleset_id);
CREATE INDEX idx_characters_updated ON public.characters (user_id, updated_at);

-- =============================================================================
-- character_attributes (value stored; options excluded per plan)
-- =============================================================================
CREATE TABLE public.character_attributes (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  character_id TEXT NOT NULL,
  attribute_id TEXT NOT NULL,
  value      TEXT NOT NULL,
  script_disabled BOOLEAN,
  ruleset_id TEXT NOT NULL,
  title      TEXT NOT NULL,
  description TEXT NOT NULL,
  category   TEXT,
  type       TEXT NOT NULL,
  default_value TEXT,
  options_chart_ref BIGINT,
  options_chart_column_header TEXT,
  allow_multi_select BOOLEAN,
  min        DOUBLE PRECISION,
  max        DOUBLE PRECISION,
  asset_id   TEXT,
  inventory_width INTEGER,
  inventory_height INTEGER,
  script_id  TEXT,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('character_attributes');
CREATE INDEX idx_character_attributes_user_ruleset ON public.character_attributes (user_id, ruleset_id);
CREATE INDEX idx_character_attributes_character ON public.character_attributes (user_id, character_id);
CREATE INDEX idx_character_attributes_updated ON public.character_attributes (user_id, updated_at);

-- =============================================================================
-- pages
-- =============================================================================
CREATE TABLE public.pages (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  label      TEXT NOT NULL,
  category   TEXT,
  asset_id   TEXT,
  background_opacity DOUBLE PRECISION,
  background_color TEXT,
  hide_from_player_view BOOLEAN,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('pages');
CREATE INDEX idx_pages_user_ruleset ON public.pages (user_id, ruleset_id);
CREATE INDEX idx_pages_updated ON public.pages (user_id, updated_at);

-- =============================================================================
-- character_pages
-- =============================================================================
CREATE TABLE public.character_pages (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  character_id TEXT NOT NULL,
  page_id    TEXT NOT NULL,
  ruleset_id TEXT NOT NULL,
  label      TEXT NOT NULL,
  category   TEXT,
  asset_id   TEXT,
  asset_url  TEXT,
  background_opacity DOUBLE PRECISION,
  background_color TEXT,
  hide_from_player_view BOOLEAN,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('character_pages');
CREATE INDEX idx_character_pages_user_ruleset ON public.character_pages (user_id, ruleset_id);
CREATE INDEX idx_character_pages_character ON public.character_pages (user_id, character_id);
CREATE INDEX idx_character_pages_updated ON public.character_pages (user_id, updated_at);

-- =============================================================================
-- character_windows
-- =============================================================================
CREATE TABLE public.character_windows (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  character_id TEXT NOT NULL,
  character_page_id TEXT,
  window_id  TEXT NOT NULL,
  title      TEXT NOT NULL,
  x          DOUBLE PRECISION NOT NULL,
  y          DOUBLE PRECISION NOT NULL,
  is_collapsed BOOLEAN NOT NULL,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('character_windows');
CREATE INDEX idx_character_windows_character ON public.character_windows (user_id, character_id);
CREATE INDEX idx_character_windows_updated ON public.character_windows (user_id, updated_at);

-- =============================================================================
-- ruleset_windows
-- =============================================================================
CREATE TABLE public.ruleset_windows (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  page_id    TEXT,
  window_id  TEXT NOT NULL,
  title      TEXT NOT NULL,
  x          DOUBLE PRECISION NOT NULL,
  y          DOUBLE PRECISION NOT NULL,
  is_collapsed BOOLEAN NOT NULL,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('ruleset_windows');
CREATE INDEX idx_ruleset_windows_user_ruleset ON public.ruleset_windows (user_id, ruleset_id);
CREATE INDEX idx_ruleset_windows_updated ON public.ruleset_windows (user_id, updated_at);

-- =============================================================================
-- inventories
-- =============================================================================
CREATE TABLE public.inventories (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  title      TEXT NOT NULL,
  category   TEXT,
  type       TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('inventories');
CREATE INDEX idx_inventories_user_ruleset ON public.inventories (user_id, ruleset_id);
CREATE INDEX idx_inventories_character ON public.inventories (user_id, character_id);
CREATE INDEX idx_inventories_updated ON public.inventories (user_id, updated_at);

-- =============================================================================
-- inventory_items
-- =============================================================================
CREATE TABLE public.inventory_items (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  character_id TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  type       TEXT NOT NULL,
  component_id TEXT NOT NULL,
  quantity   INTEGER NOT NULL,
  x          DOUBLE PRECISION NOT NULL,
  y          DOUBLE PRECISION NOT NULL,
  label      TEXT,
  description TEXT,
  value      TEXT,
  is_equipped BOOLEAN,
  custom_properties JSONB,
  action_ids JSONB,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('inventory_items');
CREATE INDEX idx_inventory_items_character ON public.inventory_items (user_id, character_id);
CREATE INDEX idx_inventory_items_inventory ON public.inventory_items (user_id, inventory_id);
CREATE INDEX idx_inventory_items_updated ON public.inventory_items (user_id, updated_at);

-- =============================================================================
-- dice_rolls
-- =============================================================================
CREATE TABLE public.dice_rolls (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  user_id_local TEXT NOT NULL,
  value      TEXT NOT NULL,
  label      TEXT NOT NULL,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('dice_rolls');
CREATE INDEX idx_dice_rolls_user_ruleset ON public.dice_rolls (user_id, ruleset_id);
CREATE INDEX idx_dice_rolls_updated ON public.dice_rolls (user_id, updated_at);

-- =============================================================================
-- scripts
-- =============================================================================
CREATE TABLE public.scripts (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  source_code TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id  TEXT,
  is_global  BOOLEAN NOT NULL,
  enabled    BOOLEAN NOT NULL,
  category   TEXT,
  hidden     BOOLEAN,
  campaign_id TEXT,
  parameters JSONB,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('scripts');
CREATE INDEX idx_scripts_user_ruleset ON public.scripts (user_id, ruleset_id);
CREATE INDEX idx_scripts_updated ON public.scripts (user_id, updated_at);

-- =============================================================================
-- script_logs
-- =============================================================================
CREATE TABLE public.script_logs (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  campaign_id TEXT,
  script_id  TEXT NOT NULL,
  character_id TEXT,
  args_json  TEXT NOT NULL,
  timestamp  BIGINT NOT NULL,
  context    TEXT,
  auto_generated BOOLEAN,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('script_logs');
CREATE INDEX idx_script_logs_user_ruleset ON public.script_logs (user_id, ruleset_id);
CREATE INDEX idx_script_logs_updated ON public.script_logs (user_id, updated_at);

-- =============================================================================
-- dependency_graph_nodes
-- =============================================================================
CREATE TABLE public.dependency_graph_nodes (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  script_id  TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id  TEXT,
  dependencies JSONB NOT NULL DEFAULT '[]',
  dependents   JSONB NOT NULL DEFAULT '[]',
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('dependency_graph_nodes');
CREATE INDEX idx_dependency_graph_nodes_user_ruleset ON public.dependency_graph_nodes (user_id, ruleset_id);
CREATE INDEX idx_dependency_graph_nodes_updated ON public.dependency_graph_nodes (user_id, updated_at);

-- =============================================================================
-- archetypes
-- =============================================================================
CREATE TABLE public.archetypes (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  description TEXT NOT NULL,
  asset_id   TEXT,
  category   TEXT,
  script_id  TEXT,
  test_character_id TEXT NOT NULL,
  is_default BOOLEAN NOT NULL,
  load_order INTEGER NOT NULL,
  variants_chart_ref BIGINT,
  variants_chart_column_header TEXT,
  module_id  TEXT,
  module_entity_id TEXT,
  module_name TEXT,
  sprites    JSONB,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('archetypes');
CREATE INDEX idx_archetypes_user_ruleset ON public.archetypes (user_id, ruleset_id);
CREATE INDEX idx_archetypes_updated ON public.archetypes (user_id, updated_at);

-- =============================================================================
-- character_archetypes
-- =============================================================================
CREATE TABLE public.character_archetypes (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  character_id TEXT NOT NULL,
  archetype_id TEXT NOT NULL,
  variant    TEXT,
  load_order INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('character_archetypes');
CREATE INDEX idx_character_archetypes_character ON public.character_archetypes (user_id, character_id);
CREATE INDEX idx_character_archetypes_updated ON public.character_archetypes (user_id, updated_at);

-- =============================================================================
-- custom_properties
-- =============================================================================
CREATE TABLE public.custom_properties (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ruleset_id TEXT NOT NULL,
  label      TEXT NOT NULL,
  type       TEXT NOT NULL,
  category   TEXT,
  default_value TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('custom_properties');
CREATE INDEX idx_custom_properties_user_ruleset ON public.custom_properties (user_id, ruleset_id);
CREATE INDEX idx_custom_properties_updated ON public.custom_properties (user_id, updated_at);

-- =============================================================================
-- archetype_custom_properties
-- =============================================================================
CREATE TABLE public.archetype_custom_properties (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  archetype_id TEXT NOT NULL,
  custom_property_id TEXT NOT NULL,
  default_value TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('archetype_custom_properties');
CREATE INDEX idx_archetype_custom_properties_archetype ON public.archetype_custom_properties (user_id, archetype_id);
CREATE INDEX idx_archetype_custom_properties_updated ON public.archetype_custom_properties (user_id, updated_at);

-- =============================================================================
-- item_custom_properties
-- =============================================================================
CREATE TABLE public.item_custom_properties (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  item_id    TEXT NOT NULL,
  custom_property_id TEXT NOT NULL,
  default_value TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('item_custom_properties');
CREATE INDEX idx_item_custom_properties_item ON public.item_custom_properties (user_id, item_id);
CREATE INDEX idx_item_custom_properties_updated ON public.item_custom_properties (user_id, updated_at);

-- =============================================================================
-- campaigns
-- =============================================================================
CREATE TABLE public.campaigns (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  label      TEXT,
  ruleset_id TEXT NOT NULL,
  world_id   TEXT,
  asset_id   TEXT,
  description TEXT,
  pinned_sidebar_documents JSONB,
  pinned_sidebar_charts JSONB,
  details    JSONB,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('campaigns');
CREATE INDEX idx_campaigns_user_ruleset ON public.campaigns (user_id, ruleset_id);
CREATE INDEX idx_campaigns_updated ON public.campaigns (user_id, updated_at);

-- =============================================================================
-- campaign_characters
-- =============================================================================
CREATE TABLE public.campaign_characters (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  character_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_scene_id TEXT,
  active     BOOLEAN,
  turn_order  INTEGER,
  turn_start_timestamp BIGINT,
  turn_end_timestamp BIGINT,
  map_height DOUBLE PRECISION,
  map_width  DOUBLE PRECISION,
  pinned_turn_order_attribute_ids JSONB,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('campaign_characters');
CREATE INDEX idx_campaign_characters_campaign ON public.campaign_characters (user_id, campaign_id);
CREATE INDEX idx_campaign_characters_character ON public.campaign_characters (user_id, character_id);
CREATE INDEX idx_campaign_characters_updated ON public.campaign_characters (user_id, updated_at);

-- =============================================================================
-- campaign_scenes
-- =============================================================================
CREATE TABLE public.campaign_scenes (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  campaign_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  category   TEXT,
  turn_based_mode BOOLEAN,
  current_turn_cycle INTEGER,
  current_step_in_cycle INTEGER,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('campaign_scenes');
CREATE INDEX idx_campaign_scenes_campaign ON public.campaign_scenes (user_id, campaign_id);
CREATE INDEX idx_campaign_scenes_updated ON public.campaign_scenes (user_id, updated_at);

-- =============================================================================
-- scene_turn_callbacks
-- =============================================================================
CREATE TABLE public.scene_turn_callbacks (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  campaign_scene_id TEXT NOT NULL,
  target_cycle INTEGER,
  created_at_cycle INTEGER NOT NULL,
  owner_id   TEXT,
  ruleset_id TEXT NOT NULL,
  script_id  TEXT NOT NULL,
  block_source TEXT NOT NULL,
  captured_character_ids JSONB,
  captured_values JSONB,
  target_character_id TEXT,
  trigger_on TEXT,
  skip_next_turn_end BOOLEAN,
  turns_remaining INTEGER,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('scene_turn_callbacks');
CREATE INDEX idx_scene_turn_callbacks_scene ON public.scene_turn_callbacks (user_id, campaign_scene_id);
CREATE INDEX idx_scene_turn_callbacks_updated ON public.scene_turn_callbacks (user_id, updated_at);

-- =============================================================================
-- campaign_events
-- =============================================================================
CREATE TABLE public.campaign_events (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  label      TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  scene_id   TEXT NOT NULL,
  script_id  TEXT,
  category   TEXT,
  parameter_values JSONB,
  type       TEXT,
  PRIMARY KEY (user_id, id)
);
SELECT apply_rls_policies('campaign_events');
CREATE INDEX idx_campaign_events_campaign ON public.campaign_events (user_id, campaign_id);
CREATE INDEX idx_campaign_events_updated ON public.campaign_events (user_id, updated_at);

-- =============================================================================
-- sync_deletes (delete log for sync layer)
-- =============================================================================
CREATE TABLE public.sync_deletes (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, table_name, entity_id)
);
SELECT apply_rls_policies('sync_deletes');
CREATE INDEX idx_sync_deletes_user_time ON public.sync_deletes (user_id, deleted_at);

-- Drop the helper (optional; keeps schema clean)
DROP FUNCTION public.apply_rls_policies(text);
