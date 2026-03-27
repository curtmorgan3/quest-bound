-- Require a non-empty email on every public.users row; one logical email per row (normalized lowercase).
-- Drops the prior UNIQUE(email) constraint from 20260404120000 in favor of this stricter migration.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;

-- Fill missing emails from Supabase Auth (source of truth for sign-in identity).
UPDATE public.users u
SET email = lower(btrim(a.email))
FROM auth.users a
WHERE u.user_id = a.id
  AND a.email IS NOT NULL
  AND btrim(a.email) <> ''
  AND (u.email IS NULL OR btrim(u.email) = '');

-- Normalize all stored emails before uniqueness + NOT NULL.
UPDATE public.users SET email = lower(btrim(email)) WHERE email IS NOT NULL;

DELETE FROM public.users WHERE email IS NULL OR btrim(email) = '';

WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY email
      ORDER BY updated_at DESC NULLS LAST, user_id::text, id
    ) AS rn
  FROM public.users
)
DELETE FROM public.users u
USING ranked r
WHERE u.ctid = r.ctid AND r.rn > 1;

ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;

ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
