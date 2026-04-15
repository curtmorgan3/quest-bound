-- Character sheet fields synced from the app (camelCase → snake_case) but missing from initial cloud schema.
-- PostgREST rejects upserts when the payload references unknown columns.

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS component_layout_overrides JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sheet_hidden_component_ids JSONB,
  ADD COLUMN IF NOT EXISTS component_script_data_patches JSONB NOT NULL DEFAULT '{}';
