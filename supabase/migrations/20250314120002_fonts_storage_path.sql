-- Add storage_path to fonts so font files can be stored in Supabase Storage (like assets).
ALTER TABLE public.fonts
  ADD COLUMN IF NOT EXISTS storage_path TEXT;
