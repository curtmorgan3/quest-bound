-- Per-character values for ruleset attribute entity custom properties (keyed by def id).
ALTER TABLE public.character_attributes
  ADD COLUMN IF NOT EXISTS attribute_custom_property_values JSONB;
