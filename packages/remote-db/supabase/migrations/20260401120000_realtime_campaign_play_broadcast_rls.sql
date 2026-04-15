-- Realtime Authorization for Quest Bound campaign play (Phase 2.3+).
-- Client uses private Broadcast on topic: campaign-play:<campaignId>
-- (see getCampaignPlayBroadcastTopic in the app).
--
-- Dashboard (required for private channels):
--   Project → Realtime → Settings → disable "Allow public access"
--   https://supabase.com/docs/guides/realtime/authorization
--
-- Apply via Supabase CLI (linked project):
--   supabase db push
-- Or run this file / paste into SQL Editor in the dashboard.
--
-- NOTE: These policies are intentionally permissive: any JWT role `authenticated`
-- (including anonymous auth sessions) may SELECT/INSERT broadcast payloads on
-- campaign-play:* topics. Tighten with your invite/session tables in Phase 2.6.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_play_authenticated_broadcast_select" ON realtime.messages;
DROP POLICY IF EXISTS "campaign_play_authenticated_broadcast_insert" ON realtime.messages;

-- Receive broadcasts (subscribe / listen)
CREATE POLICY "campaign_play_authenticated_broadcast_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND (SELECT realtime.topic()) LIKE 'campaign-play:%'
);

-- Send broadcasts
CREATE POLICY "campaign_play_authenticated_broadcast_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.messages.extension = 'broadcast'
  AND (SELECT realtime.topic()) LIKE 'campaign-play:%'
);
