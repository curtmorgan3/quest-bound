-- Add sticky flag to ruleset and character windows.
-- When true, the window stays fixed on screen while the character sheet scrolls.

ALTER TABLE public.ruleset_windows
  ADD COLUMN IF NOT EXISTS sticky BOOLEAN;
COMMENT ON COLUMN public.ruleset_windows.sticky IS
  'When true, the window stays fixed on screen while the character sheet scrolls; propagated to character_windows.';

ALTER TABLE public.character_windows
  ADD COLUMN IF NOT EXISTS sticky BOOLEAN;
COMMENT ON COLUMN public.character_windows.sticky IS
  'When true, the window stays fixed on screen while the character sheet scrolls; copied from ruleset_windows.';
