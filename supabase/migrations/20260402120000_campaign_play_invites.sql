-- Phase 2.6: campaign play join invites (one row per campaign), narrow RPC for token resolution.

CREATE TABLE public.campaign_play_invites (
  campaign_id text NOT NULL,
  host_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  join_token text NOT NULL,
  channel_name text NOT NULL,
  ruleset_id text NOT NULL,
  campaign_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_play_invites_pkey PRIMARY KEY (campaign_id),
  CONSTRAINT campaign_play_invites_join_token_key UNIQUE (join_token)
);

CREATE INDEX campaign_play_invites_host_user_id_idx ON public.campaign_play_invites (host_user_id);

COMMENT ON TABLE public.campaign_play_invites IS
  'Join capability for campaign realtime play; join_token is secret; one invite row per campaign.';

ALTER TABLE public.campaign_play_invites ENABLE ROW LEVEL SECURITY;

-- Host-only CRUD; requires cloud_sync_enabled() (same gate as data sync).
CREATE POLICY campaign_play_invites_host_all
  ON public.campaign_play_invites
  FOR ALL
  TO authenticated
  USING (
    host_user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    host_user_id = (SELECT auth.uid())
    AND (SELECT public.cloud_sync_enabled())
  );

CREATE OR REPLACE FUNCTION public.set_campaign_play_invites_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_play_invites_set_updated_at ON public.campaign_play_invites;
CREATE TRIGGER campaign_play_invites_set_updated_at
  BEFORE UPDATE ON public.campaign_play_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_campaign_play_invites_updated_at();

-- Exact token match → channel + ids + label + default scene (for deep-linking). No token → no row.
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

REVOKE ALL ON FUNCTION public.resolve_campaign_join_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_campaign_join_token(text) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_play_invites TO authenticated;
