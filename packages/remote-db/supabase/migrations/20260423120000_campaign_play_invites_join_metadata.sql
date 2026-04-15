-- Option B: all join resolution metadata lives on campaign_play_invites only.
-- Removes dependency on public.campaigns / public.campaign_scenes for token resolve.

ALTER TABLE public.campaign_play_invites
  ADD COLUMN IF NOT EXISTS default_campaign_scene_id text;

COMMENT ON COLUMN public.campaign_play_invites.default_campaign_scene_id IS
  'Host-provided default scene for new joiners (from local Dexie at token create/rotate).';

CREATE OR REPLACE FUNCTION public.resolve_campaign_join_token(p_token text)
RETURNS TABLE (
  channel_name text,
  campaign_id text,
  ruleset_id text,
  campaign_label text,
  default_campaign_scene_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    i.channel_name,
    i.campaign_id,
    i.ruleset_id,
    i.campaign_label,
    i.default_campaign_scene_id
  FROM public.campaign_play_invites i
  WHERE i.join_token = p_token
  LIMIT 1;
$$;
