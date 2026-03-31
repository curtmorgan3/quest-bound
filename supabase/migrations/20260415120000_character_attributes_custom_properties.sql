-- Mirrors ruleset attribute custom property schema JSON on character attribute rows.
ALTER TABLE public.character_attributes
  ADD COLUMN IF NOT EXISTS custom_properties TEXT;
