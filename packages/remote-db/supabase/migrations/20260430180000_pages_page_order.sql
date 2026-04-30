-- Sort order for ruleset sheet page templates (`Page.order` locally; Postgres column avoids reserved keyword `ORDER`).
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS page_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_pages_user_ruleset_page_order
  ON public.pages (user_id, ruleset_id, page_order);
