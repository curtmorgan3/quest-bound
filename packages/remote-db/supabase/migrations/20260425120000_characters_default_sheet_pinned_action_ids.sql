-- Default sheet pinned actions (client Character.defaultSheetPinnedActionIds); mirrors default_sheet_pinned_attribute_ids.

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS default_sheet_pinned_action_ids JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.characters.default_sheet_pinned_action_ids IS
  'Ruleset action ids pinned on the default character sheet actions column.';
