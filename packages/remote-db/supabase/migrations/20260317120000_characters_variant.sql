-- Primary archetype variant on character (synced with local character records that carry variant from creation flow).
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS variant TEXT;
