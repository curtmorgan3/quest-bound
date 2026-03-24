-- Phase 2.2: soft-delete tombstones for coordinated sync entities (default false for existing rows).

ALTER TABLE public.character_attributes
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.character_archetypes
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.script_logs
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.campaign_characters
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.campaign_scenes
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;
