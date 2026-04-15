-- QBScript sheet UI: per-window overlay components (synced as camelCase scriptOverlayComponents).

ALTER TABLE public.character_windows
  ADD COLUMN IF NOT EXISTS script_overlay_components TEXT;

COMMENT ON COLUMN public.character_windows.script_overlay_components IS
  'Stringified JSON array of script-created components for this character window (QBScript sheet UI).';
