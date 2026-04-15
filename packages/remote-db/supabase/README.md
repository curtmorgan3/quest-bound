# Quest Bound — Supabase / Cloud Sync

This directory contains Supabase project configuration and migrations for **Phase 1: Multi-Device Sync**.

Run Supabase CLI commands from **`packages/remote-db`** (the parent of this `supabase/` folder), or from the repository root with **`npm run db:* -w @quest-bound/remote-db`**.

## Contents

- **`config.toml`** — Project config for Supabase CLI (local dev, migrations).
- **`migrations/`** — SQL migrations applied in order:
  - `20250314120000_initial_sync_schema.sql` — 32 synced tables + `sync_deletes`, RLS, indexes.
  - `20250314120001_storage_buckets.sql` — Storage buckets `assets` and `fonts` with per-user RLS.

## Setup

1. Create a [Supabase project](https://supabase.com/dashboard) (free tier).
2. Enable **Email/Password** auth; optionally enable CAPTCHA on signup/login.
3. Link the project (optional, for remote push), from `packages/remote-db`:
   ```bash
   cd packages/remote-db
   npx supabase link --project-ref <your-project-ref>
   ```
4. Run migrations against the remote DB:
   ```bash
   cd packages/remote-db
   npx supabase db push
   ```
   Or from the repo root: `npm run db:push -w @quest-bound/remote-db`.
   Or apply the SQL in `migrations/` manually in the SQL Editor.

## Testing RLS

Row Level Security ensures **user A cannot see or modify user B's data**.

1. **Auth**: Create two test users (e.g. User A and User B) via Supabase Auth (Dashboard or API).
2. **Tables**: With the anon key and User A's JWT, insert a row into any synced table (e.g. `rulesets`) with `user_id = auth.uid()` (automatic via default). Then switch to User B's JWT.
3. **Verify**:
   - `SELECT * FROM rulesets` as User B should return only User B's rows (User A's row must not appear).
   - As User B, `INSERT`/`UPDATE`/`DELETE` with `user_id` set to User A's UUID should be rejected by RLS.
4. **Storage**: Upload a file to `assets` as User A under path `{user_a_uid}/test.png`. As User B, attempt to read or list that path — access should be denied. Only paths under `{user_b_uid}/` should be visible to User B.

Manual checks in SQL Editor (as a superuser) are not sufficient; use the Supabase client with two different auth sessions (e.g. two browser profiles or API requests with different JWTs) to confirm isolation.

## Column naming

- **Postgres**: All columns use `snake_case` (e.g. `ruleset_id`, `created_at`).
- **Dexie / app**: Uses `camelCase` (e.g. `rulesetId`, `createdAt`).
- The sync layer (Phase 1 Step 4+) maps between them; Supabase JS client can also be configured for key transformation.

## Excluded fields (sync layer)

The following Dexie fields are **not** stored remotely (injected at read time or ephemeral). The sync layer strips them before push:

- `image`, `backgroundImage`, `mapAsset`, `charactersCtaImage`, `campaignsCtaImage` (resolved from `assetId`)
- `selected` on `Component`
- `options` on `Attribute` / `CharacterAttribute` (chart-options-middleware)
- `variantOptions` on `Archetype` (injected)
- Resolved `sprites` and image data in `customProperties[].defaultValue`

See `agents/data-sync/phase-1.md` § 3.3 for the full list.
