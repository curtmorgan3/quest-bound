-- Page / sheet window stacking order (client RulesetWindow.layer / CharacterWindow.layer → layer).

ALTER TABLE public.ruleset_windows
  ADD COLUMN IF NOT EXISTS layer INTEGER;

COMMENT ON COLUMN public.ruleset_windows.layer IS
  'Stacking order on the page template (higher = in front); used as z-index when rendering.';

ALTER TABLE public.character_windows
  ADD COLUMN IF NOT EXISTS layer INTEGER;

COMMENT ON COLUMN public.character_windows.layer IS
  'Stacking order on the character sheet; copied from ruleset_windows when the template updates.';
