-- QA seed: sample marketplace game(s). Run manually after migrations (not part of `db push` by default).
--
-- Prerequisites:
--   - At least one row in public.organization_rulesets (org + ruleset link from cloud sync or test data).
--
-- What it does:
--   - Inserts one `preview` storefront on the first linked ruleset (slug `sample-game`) for anonymous testing.
--   - Inserts one `draft` storefront on the same org/ruleset (slug `sample-game-draft`) for member/staff tests.
--
-- Usage (from packages/remote-db, with DB URL set):
--   psql "$DATABASE_URL" -f seed-marketplace-qa.sql
--
-- If your project has no organization_rulesets rows, this is a no-op (RAISE NOTICE).

DO $$
DECLARE
  v_org_id uuid;
  v_ruleset_id text;
  v_owner uuid;
  v_org_name text;
  v_org_slug text;
BEGIN
  SELECT
    orgr.organization_id,
    orgr.ruleset_id,
    orgr.owner_user_id,
    o.name,
    o.slug
  INTO v_org_id, v_ruleset_id, v_owner, v_org_name, v_org_slug
  FROM public.organization_rulesets AS orgr
  INNER JOIN public.organizations AS o ON o.id = orgr.organization_id
  ORDER BY orgr.created_at
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'seed-marketplace-qa: no organization_rulesets row; skip inserts.';
    RETURN;
  END IF;

  INSERT INTO public.games (
    organization_id,
    publisher_id,
    ruleset_id,
    slug,
    status,
    price,
    version,
    title,
    cover_image_url,
    header,
    release_date,
    publisher_name,
    description,
    details,
    carousel_assets,
    links
  )
  VALUES (
    v_org_id,
    v_owner,
    v_ruleset_id,
    'sample-game',
    'preview',
    19.99,
    '1.0.0',
    'Sample Quest Bound storefront',
    'https://placehold.co/600x800/png?text=Cover',
    'Playtest-ready sample listing',
    CURRENT_DATE,
    COALESCE(v_org_name, 'Publisher'),
    $markdown$## Sample game

This row exists for **QA** (`seed-marketplace-qa.sql`). Try:

- `/{org}/g/sample-game` — **preview** (visible to everyone).
- `/{org}/g/sample-game-draft` — **draft** (members / staff only).

$markdown$::text,
    '{}'::jsonb,
    '[]'::jsonb,
    '[
      {"label": "Quest Bound", "href": "https://questbound.com"}
    ]'::jsonb
  )
  ON CONFLICT ON CONSTRAINT games_org_slug_uidx DO NOTHING;

  INSERT INTO public.games (
    organization_id,
    publisher_id,
    ruleset_id,
    slug,
    status,
    price,
    version,
    title,
    cover_image_url,
    header,
    release_date,
    publisher_name,
    description,
    details,
    carousel_assets,
    links
  )
  VALUES (
    v_org_id,
    v_owner,
    v_ruleset_id,
    'sample-game-draft',
    'draft',
    19.99,
    '1.0.0',
    'Sample draft storefront',
    'https://placehold.co/600x800/png?text=Draft',
    'Draft-only QA listing',
    CURRENT_DATE,
    COALESCE(v_org_name, 'Publisher'),
    'This **draft** listing should 404 for anonymous users.',
    '{}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )
  ON CONFLICT ON CONSTRAINT games_org_slug_uidx DO NOTHING;

  RAISE NOTICE 'seed-marketplace-qa: inserted sample games for org % (slug: %). Try /%/g/sample-game', v_org_id, v_org_slug, v_org_slug;
END;
$$;
