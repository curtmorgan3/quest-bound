-- Window editor: which state layer is being edited (not used on character sheets at runtime).

ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS editor_state_target TEXT;

COMMENT ON COLUMN public.components.editor_state_target IS
  'Editor-only: Component.editorStateTarget — named state or null for base (default) layer.';
