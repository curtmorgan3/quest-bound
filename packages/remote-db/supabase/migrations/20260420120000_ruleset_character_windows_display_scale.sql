-- Window layout uniform scale (client displayScale → display_scale). Sync was failing with PGRST204
-- when PostgREST received rows including display_scale on ruleset_windows.

ALTER TABLE public.ruleset_windows
  ADD COLUMN IF NOT EXISTS display_scale DOUBLE PRECISION;

COMMENT ON COLUMN public.ruleset_windows.display_scale IS
  'Uniform scale on page template (1 = design size); client RulesetWindow.displayScale.';

ALTER TABLE public.character_windows
  ADD COLUMN IF NOT EXISTS display_scale DOUBLE PRECISION;

COMMENT ON COLUMN public.character_windows.display_scale IS
  'Uniform scale for sheet layout; client CharacterWindow.displayScale.';
