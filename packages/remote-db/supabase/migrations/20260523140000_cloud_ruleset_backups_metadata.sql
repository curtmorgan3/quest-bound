-- Add display metadata to cloud_ruleset_backups so the homepage can show
-- rich cards for cloud-only rulesets without downloading the zip.
ALTER TABLE public.cloud_ruleset_backups
  ADD COLUMN IF NOT EXISTS title      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS version    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_module  boolean NOT NULL DEFAULT false;
