-- Persist per-page “fit sheet to viewport” preference (Dexie CharacterPage.sheetFitToViewport).

ALTER TABLE public.character_pages
  ADD COLUMN IF NOT EXISTS sheet_fit_to_viewport BOOLEAN;

COMMENT ON COLUMN public.character_pages.sheet_fit_to_viewport IS
  'When true, scale the character sheet page so all windows fit in the viewport (client sheetFitToViewport).';
