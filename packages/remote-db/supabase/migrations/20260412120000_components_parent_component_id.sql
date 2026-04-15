-- Align cloud `components` with local v60: grouped sheet items reference a parent group root.

ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS parent_component_id TEXT;

COMMENT ON COLUMN public.components.parent_component_id IS
  'Window-local parent group root component id (Dexie parentComponentId); null for top-level items.';
