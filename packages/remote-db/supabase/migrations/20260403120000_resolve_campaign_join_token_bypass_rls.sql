-- Joiners are not the invite host: RLS on campaign_play_invites and campaigns uses auth.uid(),
-- so SECURITY DEFINER alone still filtered out all rows. Match org helper pattern (row_security off).

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
    c.label AS campaign_label,
    (
      SELECT cs.id
      FROM public.campaign_scenes cs
      WHERE cs.user_id = i.host_user_id
        AND cs.campaign_id = i.campaign_id
      ORDER BY cs.created_at ASC
      LIMIT 1
    ) AS default_campaign_scene_id
  FROM public.campaign_play_invites i
  INNER JOIN public.campaigns c
    ON c.user_id = i.host_user_id
   AND c.id = i.campaign_id
  WHERE i.join_token = p_token
  LIMIT 1;
$$;
