-- Optional JSON metadata on ruleset actions and attributes (entity custom property schema).
ALTER TABLE public.attributes
  ADD COLUMN IF NOT EXISTS custom_properties TEXT;

ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS custom_properties TEXT;
