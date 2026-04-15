-- Font files live in Storage (storage_path). Sync push clears inline `data` after upload,
-- matching assets. `fonts.data` must allow NULL like `assets.data` or upserts fail.
ALTER TABLE public.fonts
  ALTER COLUMN data DROP NOT NULL;
