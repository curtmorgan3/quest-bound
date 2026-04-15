-- Manual list options for character_attributes (ruleset attributes already had options JSONB).
-- Chart-backed lists still store options_chart_ref / options_chart_column_header; options is omitted on push when a chart ref is set.
ALTER TABLE public.character_attributes
  ADD COLUMN IF NOT EXISTS options JSONB;
