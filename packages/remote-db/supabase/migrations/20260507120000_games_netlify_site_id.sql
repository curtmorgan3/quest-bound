-- Persist the Netlify site id for each game so the bundler can redeploy in place
-- on subsequent runs without scanning Netlify's API for a custom_domain match.

ALTER TABLE public.games
  ADD COLUMN netlify_site_id text;

COMMENT ON COLUMN public.games.netlify_site_id IS
  'Netlify site UUID populated after the first successful deploy. Subsequent deploys reuse this site.';

-- A given Netlify site only ever serves one game; partial-unique index allows multiple NULLs
-- (every game starts NULL until its first deploy).
CREATE UNIQUE INDEX games_netlify_site_id_uidx
  ON public.games (netlify_site_id)
  WHERE netlify_site_id IS NOT NULL;
