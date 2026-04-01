-- Component visual states (ruleset template) and per-window active custom state map (character sheet).

ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS states TEXT NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.components.states IS
  'Stringified JSON array of named state entries (sparse data/style diffs vs base).';

ALTER TABLE public.character_windows
  ADD COLUMN IF NOT EXISTS component_active_states TEXT NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.character_windows.component_active_states IS
  'Stringified JSON object: componentId -> active custom state name (component.setState).';
