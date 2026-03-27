-- Enforce unique non-null emails on synced user profiles.
-- PostgreSQL treats NULL as distinct for UNIQUE, so rows without an email are unaffected.
ALTER TABLE public.users
  ADD CONSTRAINT users_email_key UNIQUE (email);
