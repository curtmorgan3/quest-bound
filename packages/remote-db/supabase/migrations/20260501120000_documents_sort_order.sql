-- Display order for ruleset/campaign documents in lists and sidebars.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_documents_user_ruleset_sort
  ON public.documents (user_id, ruleset_id, sort_order);
