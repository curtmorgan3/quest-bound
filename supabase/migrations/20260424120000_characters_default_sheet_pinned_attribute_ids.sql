-- Default sheet pinned attributes (client Character.defaultSheetPinnedAttributeIds); sync pushes this but
-- the column was missing from the cloud schema (PostgREST PGRST204 / schema cache).

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS default_sheet_pinned_attribute_ids JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.characters.default_sheet_pinned_attribute_ids IS
  'Attribute ids pinned on the default character sheet; mirrors pinned_sidebar_* JSONB arrays.';
